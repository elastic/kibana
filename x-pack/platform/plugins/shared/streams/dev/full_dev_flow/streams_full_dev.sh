#!/usr/bin/env bash
# Full local Streams backend for UI development.
#
# You start kind, two Tilts, serverless ES, and Kibana. This script does the
# rest: motel, host ES alias, unit publish, local TLS hacks, and demo traffic
# so Canvas / Discover have logs and collector metrics to show.
#
# Usage:
#   ./x-pack/platform/plugins/shared/streams/dev/full_dev_flow/streams_full_dev.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR" && git rev-parse --show-toplevel)"
ASSETS="$SCRIPT_DIR"
STATE_DIR="${STREAMS_LOCAL_STATE_DIR:-${TMPDIR:-/tmp}/streams-full-dev}"
KUBE_CONTEXT="${KUBE_CONTEXT:-kind-streams}"
UNIT_ID="${STREAMS_UNIT_ID:-default}"
UNIT_NS="${STREAMS_UNIT_NAMESPACE:-project-dev}"
TARGET_ID="${STREAMS_TARGET_ID:-dev}"
# observability-ci does not publish :latest for these images. Empty means
# resolve from the controller checkout / the motel Deployment already on kind.
# Override with STREAMS_COLLECTOR_TAG / STREAMS_MOTEL_COLLECTOR_TAG.
COLLECTOR_TAG="${STREAMS_COLLECTOR_TAG:-}"
MOTEL_COLLECTOR_TAG="${STREAMS_MOTEL_COLLECTOR_TAG:-}"
MOTEL_NS="motel-ingest-collector"
MOTEL_PORT="${STREAMS_MOTEL_PORT:-14318}"
LOGS_DEV_DS="logs-application.otel-dev"
LOGS_PROD_DS="logs-application.otel-prod"
METRICS_DS="metrics-streams.otel-default"
ES_USER="${ES_USER:-elastic_serverless}"
ES_PASS="${ES_PASS:-changeme}"
CA="${CA:-$REPO_ROOT/src/platform/packages/shared/kbn-dev-utils/certs/ca.crt}"

STREAMS_CONTROLLER="${STREAMS_CONTROLLER:-$(cd "$REPO_ROOT/../streams-controller" 2>/dev/null && pwd || true)}"

mkdir -p "$STATE_DIR"

log() { printf '==> %s\n' "$*"; }
warn() { printf '!!  %s\n' "$*" >&2; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }
ok() { printf '    [ok]      %s\n' "$*"; }
missing() { printf '    [missing] %s\n' "$*"; }

need() {
  command -v "$1" >/dev/null 2>&1 || die "need $1 on PATH"
}

kubectl_ctx() {
  kubectl --context "$KUBE_CONTEXT" "$@"
}

# First non-latest streams-collector tag in the controller checkout.
controller_streams_collector_tag() {
  [[ -n "${STREAMS_CONTROLLER:-}" ]] || return 0
  python3 - "$STREAMS_CONTROLLER" <<'PY'
from pathlib import Path
import re
import sys

root = Path(sys.argv[1])
for rel in ("dev/values.yaml", "helm/values.yaml"):
    path = root / rel
    if not path.exists():
        continue
    match = re.search(
        r"repository: docker\.elastic\.co/observability-ci/streams-collector\n\s+tag:\s+(\S+)",
        path.read_text(),
    )
    if match and match.group(1) != "latest":
        print(match.group(1))
        raise SystemExit(0)
PY
}

deploy_image_tag() {
  local ns="$1" deploy="$2" image tag
  # Prefer a Running pod. The Deployment spec may already be a broken :latest.
  image="$(kubectl_ctx -n "$ns" get pods -l "app=$deploy" -o json 2>/dev/null \
    | jq -r '.items[] | select(.status.phase=="Running") | .spec.containers[0].image' \
    | grep -v ':latest$' | head -1 || true)"
  if [[ -z "$image" ]]; then
    image="$(kubectl_ctx -n "$ns" get deploy "$deploy" \
      -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || true)"
  fi
  [[ "$image" == *:* ]] || return 0
  tag="${image##*:}"
  [[ -n "$tag" && "$tag" != "latest" ]] || return 0
  printf '%s' "$tag"
}

resolve_image_tags() {
  local helm_tag running_motel
  helm_tag="$(controller_streams_collector_tag || true)"
  if [[ -z "$COLLECTOR_TAG" ]]; then
    COLLECTOR_TAG="$helm_tag"
  fi
  if [[ -z "$MOTEL_COLLECTOR_TAG" ]]; then
    running_motel="$(deploy_image_tag "$MOTEL_NS" motel-ingest-collector || true)"
    MOTEL_COLLECTOR_TAG="${running_motel:-$helm_tag}"
  fi
  [[ -n "$MOTEL_COLLECTOR_TAG" && "$MOTEL_COLLECTOR_TAG" != "latest" ]] \
    || die "no motel image tag (observability-ci has no :latest). Set STREAMS_MOTEL_COLLECTOR_TAG or check streams-controller helm/values.yaml"
  log "image tags: streams-collector=${COLLECTOR_TAG:-<unchanged>}  hosted-otel-collector=$MOTEL_COLLECTOR_TAG"
}

detect_es() {
  local auth="$ES_USER:$ES_PASS"
  if [[ -z "${ES:-}" ]]; then
    if curl -sk --max-time 3 -u "$auth" "https://localhost:9200" 2>/dev/null | grep -q '"tagline"'; then
      ES="https://localhost:9200"
    elif curl -s --max-time 3 -u "$auth" "http://localhost:9200" 2>/dev/null | grep -q '"tagline"'; then
      ES="http://localhost:9200"
    else
      ES=""
    fi
  fi
}

es_curl() {
  # Always seed the array: empty "${arr[@]}" is unbound under bash 3.2 + set -u.
  local args=(-sS)
  if [[ "$ES" == https://* ]]; then
    args+=(-k)
    [[ -f "$CA" ]] && args+=(--cacert "$CA")
  fi
  curl "${args[@]}" -u "$ES_USER:$ES_PASS" "$@"
}

detect_kibana() {
  if [[ -n "${KIBANA_URL:-}" && -n "${KIBANA_AUTH:-}" ]]; then
    return 0
  fi
  local url auth
  for url in http://localhost:5601 https://localhost:5601; do
    for auth in "$ES_USER:$ES_PASS" elastic_serverless:changeme elastic:changeme; do
      if curl -sk --max-time 3 -o /dev/null -w '%{http_code}' "$url/api/status" 2>/dev/null | grep -q '^200$'; then
        if curl -sk --max-time 3 -o /dev/null -w '%{http_code}' -u "$auth" \
          -H 'kbn-xsrf: true' "$url/api/security/v1/me" 2>/dev/null | grep -qvE '^(000|401)$'; then
          KIBANA_URL="$url"
          KIBANA_AUTH="$auth"
          return 0
        fi
      fi
    done
  done
  KIBANA_URL=""
  KIBANA_AUTH=""
}

kb_curl() {
  local args=(-sS)
  [[ "$KIBANA_URL" == https://* ]] && args+=(-k)
  curl "${args[@]}" --max-time 90 -u "$KIBANA_AUTH" \
    -H 'kbn-xsrf: true' \
    -H 'x-elastic-internal-origin: kibana' \
    "$@"
}

ds_has_docs() {
  local ds="$1"
  [[ -n "$ES" ]] && es_curl "$ES/$ds/_count" 2>/dev/null | jq -e '.count > 0' >/dev/null 2>&1
}

# The distributor API is mTLS. A curl without a client cert gets
# "certificate required" and http_code 000 even when Tilt is forwarding it.
port_open() {
  local host="$1" port="$2"
  if command -v nc >/dev/null 2>&1; then
    nc -z -G 1 "$host" "$port" >/dev/null 2>&1 && return 0
  fi
  bash -c "echo >/dev/tcp/${host}/${port}" >/dev/null 2>&1
}

distributor_up() {
  port_open 127.0.0.1 18443 && return 0
  kubectl_ctx -n streams-config-distributor get deploy >/dev/null 2>&1
}

cmd_status() {
  detect_es
  detect_kibana
  echo "Long-running processes (start these yourself, leave them up):"
  if kubectl_ctx get ns >/dev/null 2>&1; then
    ok "kind cluster ($KUBE_CONTEXT)"
  else
    missing "kind cluster  →  cd streams-controller && make kind"
  fi
  if distributor_up; then
    ok "distributor Tilt API https://localhost:18443"
  else
    missing "distributor  →  cd streams-config-distributor && tilt up --context kind-streams -- --port 18443"
  fi
  if kubectl_ctx -n streams-controller get deploy streams-controller >/dev/null 2>&1; then
    ok "controller Deployment"
  else
    missing "controller  →  cd streams-controller && tilt up --port 10351"
  fi
  if [[ -n "$ES" ]]; then
    ok "Elasticsearch $ES ($ES_USER)"
  else
    missing "Elasticsearch  →  pnpm es serverless --projectType=observability"
  fi
  if [[ -n "$KIBANA_URL" ]]; then
    ok "Kibana $KIBANA_URL"
  else
    missing "Kibana  →  pnpm serverless-oblt"
  fi
  echo
  echo "Ephemeral pieces this script manages:"
  if kubectl_ctx -n es get svc "$TARGET_ID" >/dev/null 2>&1; then
    ok "Service es/$TARGET_ID → host.docker.internal"
  else
    missing "Service es/$TARGET_ID"
  fi
  if kubectl_ctx -n "$MOTEL_NS" get deploy motel-ingest-collector >/dev/null 2>&1; then
    ok "motel Deployment"
  else
    missing "motel Deployment"
  fi
  if curl -s --max-time 1 -o /dev/null -w '%{http_code}' "http://localhost:$MOTEL_PORT" 2>/dev/null | grep -qv '^000$'; then
    ok "motel port-forward localhost:$MOTEL_PORT"
  else
    missing "motel port-forward localhost:$MOTEL_PORT"
  fi
  if kubectl_ctx -n "$UNIT_NS" get "streamunit/$UNIT_ID" >/dev/null 2>&1; then
    ok "StreamUnit $UNIT_NS/$UNIT_ID"
  else
    missing "StreamUnit $UNIT_NS/$UNIT_ID"
  fi
  if ds_has_docs "$LOGS_DEV_DS" || ds_has_docs "$LOGS_PROD_DS"; then
    ok "demo logs ($LOGS_DEV_DS / $LOGS_PROD_DS)"
  else
    missing "demo logs"
  fi
  if ds_has_docs "$METRICS_DS"; then
    ok "collector metrics ($METRICS_DS)"
  else
    missing "collector metrics ($METRICS_DS)"
  fi
}

patch_controller_values() {
  local values="$STREAMS_CONTROLLER/dev/values.yaml"
  [[ -f "$values" ]] || { warn "no $values"; return 1; }
  python3 - "$values" "$COLLECTOR_TAG" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
tag = sys.argv[2]
text = path.read_text()
changed = False

image_block = re.search(
    r"(    image:\n      repository: docker\.elastic\.co/observability-ci/streams-collector\n      tag: )(\S+)",
    text,
)
if not image_block:
    sys.exit("could not find processing.image.tag in dev/values.yaml")
# :latest is not published. Only rewrite when we have a real tag and it differs,
# or when the checkout was left on latest by an older run of this script.
if tag and image_block.group(2) != tag:
    text = text[: image_block.start()] + image_block.group(1) + tag + text[image_block.end() :]
    changed = True
    print(f"patched collector image tag -> {tag}")
elif image_block.group(2) == "latest" and not tag:
    sys.exit(
        "dev/values.yaml has streams-collector:latest (not published). "
        "Set STREAMS_COLLECTOR_TAG or restore helm/values.yaml"
    )

if "elasticsearch_url_format:" not in text:
    inserted = re.sub(
        r"(  processing:\n(?:    #.*\n)*    hardware_profile: \"\"\n)",
        r'\1    elasticsearch_url_format: "https://%s.es.svc.cluster.local:9200"\n',
        text,
        count=1,
    )
    if inserted == text:
        sys.exit("could not insert processing.elasticsearch_url_format in dev/values.yaml")
    text = inserted
    changed = True
    print("patched elasticsearch_url_format -> es/dev")

if "telemetry.newPipelineTelemetry" not in text:
    inserted = re.sub(
        r"(      tag: \S+[^\n]*\n)(    kafka:\n)",
        r"\1    feature_gates:\n      - telemetry.newPipelineTelemetry\n\2",
        text,
        count=1,
    )
    if "telemetry.newPipelineTelemetry" not in inserted:
        print(
            "skipping feature_gates insert (helm values already set telemetry.newPipelineTelemetry)",
            file=sys.stderr,
        )
    else:
        text = inserted
        changed = True
        print("patched feature_gates telemetry.newPipelineTelemetry")

if "user_facing:" not in text:
    old_header = "    telemetry:\n      log_level: debug\n      internal:\n"
    new_header = "    telemetry:\n      log_level: debug\n      metrics_level: detailed\n      internal:\n"
    if old_header in text:
        text = text.replace(old_header, new_header, 1)
    old_servers = "        servers: []\n"
    new_servers = """        servers: []
      user_facing:
        enabled: true
        interval: 10000
        loopback_endpoint: localhost:4318
"""
    if old_servers not in text:
        sys.exit("could not find telemetry.internal.servers in dev/values.yaml")
    text = text.replace(old_servers, new_servers, 1)
    changed = True
    print("patched user_facing telemetry")

path.write_text(text)
if not changed:
    print("controller values already patched")
PY
}

patch_telemetry_tls() {
  local tpl="$STREAMS_CONTROLLER/internal/workload/telemetry.tpl.yml"
  [[ -f "$tpl" ]] || { warn "no $tpl"; return 1; }
  if grep -q 'insecure_skip_verify: true' "$tpl"; then
    log "telemetry.tpl.yml already has local TLS skip"
    return 0
  fi
  python3 - "$tpl" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
text = path.read_text()
old = """    headers:
      Authorization: {{ printf "%q" .Authorization }}
    sending_queue:
"""
new = """    headers:
      Authorization: {{ printf "%q" .Authorization }}
    tls:
      insecure_skip_verify: true
      server_name_override: host.docker.internal
    sending_queue:
"""
if old not in text:
    sys.exit("could not find otlp_http/streams-telemetry headers in telemetry.tpl.yml")
path.write_text(text.replace(old, new, 1))
print("patched", path)
PY
}

ensure_controller_patches() {
  if [[ -z "${STREAMS_CONTROLLER:-}" || ! -d "$STREAMS_CONTROLLER/.git" ]]; then
    warn "streams-controller checkout not found (set STREAMS_CONTROLLER). Skipping local patches."
    warn "user-facing collector telemetry must already be enabled in the running controller."
    return 0
  fi
  log "patching $STREAMS_CONTROLLER (local only, do not commit/push)"
  patch_controller_values
  patch_telemetry_tls
  if kubectl_ctx -n streams-controller get deploy streams-controller >/dev/null 2>&1; then
    log "waiting for controller Tilt to rebuild (ko watches the template)"
    kubectl_ctx -n streams-controller rollout status deploy/streams-controller --timeout=180s \
      || warn "controller rollout did not finish; Tilt may still be building"
  fi
}

ensure_es_alias() {
  log "ensuring es/$TARGET_ID → host.docker.internal"
  kubectl_ctx apply -f "$ASSETS/es_alias.yaml" >/dev/null
}

ensure_motel() {
  log "ensuring motel"
  local rendered="$STATE_DIR/motel.yaml"
  sed "s/__COLLECTOR_TAG__/$MOTEL_COLLECTOR_TAG/g" "$ASSETS/motel.yaml" > "$rendered"
  kubectl_ctx apply -f "$rendered" >/dev/null
  if [[ -n "${STREAMS_CONTROLLER:-}" && -x "$STREAMS_CONTROLLER/dev/registry-secret.sh" ]]; then
    NAMESPACE="$MOTEL_NS" bash "$STREAMS_CONTROLLER/dev/registry-secret.sh"
  else
    warn "could not create motel image pull secret; set STREAMS_CONTROLLER or run docker login + registry-secret.sh"
  fi
  kubectl_ctx -n "$MOTEL_NS" rollout status deploy/motel-ingest-collector --timeout=180s
  ensure_motel_forward
}

ensure_motel_forward() {
  if curl -s --max-time 1 -o /dev/null "http://localhost:$MOTEL_PORT" 2>/dev/null; then
    log "motel already reachable on localhost:$MOTEL_PORT"
    return 0
  fi
  if curl -s --max-time 1 -o /dev/null -w '%{http_code}' "http://localhost:$MOTEL_PORT" 2>/dev/null | grep -qv '^000$'; then
    return 0
  fi
  log "starting motel port-forward localhost:$MOTEL_PORT → $MOTEL_NS/svc:8443"
  kubectl_ctx -n "$MOTEL_NS" port-forward svc/motel-ingest-collector "$MOTEL_PORT:8443" \
    >"$STATE_DIR/motel-port-forward.log" 2>&1 &
  echo $! > "$STATE_DIR/motel-port-forward.pid"
  local i
  for i in $(seq 1 20); do
    if curl -s --max-time 1 -o /dev/null -w '%{http_code}' "http://localhost:$MOTEL_PORT" 2>/dev/null | grep -qv '^000$'; then
      return 0
    fi
    sleep 0.5
  done
  warn "motel port-forward did not come up; see $STATE_DIR/motel-port-forward.log"
}

mint_api_key() {
  if [[ -f "$STATE_DIR/api_key" && -s "$STATE_DIR/api_key" ]]; then
    KEY="$(cat "$STATE_DIR/api_key")"
    if es_curl -o /dev/null -w '%{http_code}' -H "Authorization: ApiKey $KEY" "$ES/" | grep -q '^200$'; then
      log "reusing API key in $STATE_DIR/api_key"
      return 0
    fi
  fi
  log "creating ES API key"
  KEY="$(es_curl -X POST "$ES/_security/api_key" \
    -H 'Content-Type: application/json' \
    -d '{"name":"streams-full-dev","expiration":"7d"}' | jq -r .encoded)"
  [[ -n "$KEY" && "$KEY" != "null" ]] || die "failed to create API key"
  printf '%s' "$KEY" > "$STATE_DIR/api_key"
  chmod 600 "$STATE_DIR/api_key"
}

wait_for_unit_artifact() {
  log "waiting for StreamUnit $UNIT_NS/$UNIT_ID spec.artifact"
  local i artifact
  for i in $(seq 1 60); do
    artifact="$(kubectl_ctx -n "$UNIT_NS" get "streamunit/$UNIT_ID" \
      -o jsonpath='{.spec.artifact}' 2>/dev/null || true)"
    if [[ -n "$artifact" ]]; then
      log "StreamUnit artifact is present (collector may still be unready until TLS is patched)"
      return 0
    fi
    sleep 2
  done
  die "StreamUnit $UNIT_NS/$UNIT_ID never got spec.artifact"
}

publish_unit() {
  local unit_file="$STATE_DIR/unit.yaml"
  sed "s/__API_KEY__/$KEY/g" "$ASSETS/unit.yaml" > "$unit_file"
  chmod 600 "$unit_file"
  log "PUT $KIBANA_URL/internal/streams/unit/$UNIT_ID (distributor validate+publish, up to 90s)"
  local body
  body="$(kb_curl -X PUT "$KIBANA_URL/internal/streams/unit/$UNIT_ID" \
    -H 'Content-Type: application/yaml' \
    --data-binary @"$unit_file")"
  if ! printf '%s' "$body" | jq -e '.compiled_config or .acknowledged' >/dev/null 2>&1; then
    printf '%s\n' "$body" >&2
    die "unit publish failed (is xpack.streams.canvas.enabled and the distributor snippet in kibana.dev.yml?)"
  fi
  log "unit publish acknowledged"
  rm -f "$unit_file"
  wait_for_unit_artifact
}

patch_artifact_tls() {
  log "patching StreamUnit artifact TLS (local ES CA + host.docker.internal SNI)"
  [[ -f "$CA" ]] || die "missing Kibana CA at $CA"
  local artifact="$STATE_DIR/artifact.yaml"
  local patched="$STATE_DIR/artifact.patched.yaml"
  kubectl_ctx -n "$UNIT_NS" get "streamunit/$UNIT_ID" -o jsonpath='{.spec.artifact}' > "$artifact"
  awk -v cert="$CA" '{print}
    /^        endpoint: \$\{env:STREAMS_ES_ENDPOINT\}$/ {
      print "        tls:"; print "            server_name_override: host.docker.internal"
      print "            ca_pem: |"
      while ((getline l < cert) > 0) print "                " l; close(cert)
    }' "$artifact" > "$patched"
  kubectl_ctx -n "$UNIT_NS" patch "streamunit/$UNIT_ID" --type=merge \
    -p "{\"spec\":{\"artifact\":$(jq -Rs . < "$patched")}}" >/dev/null
  log "waiting for collector Deployment $UNIT_NS/$UNIT_ID rollout"
  if ! kubectl_ctx -n "$UNIT_NS" rollout status "deployment/$UNIT_ID" --timeout=180s; then
    warn "collector did not become ready. Recent logs:"
    kubectl_ctx -n "$UNIT_NS" logs "deploy/$UNIT_ID" --tail=30 || true
    die "collector rollout failed (unknown otlp_http: image is too old; set STREAMS_COLLECTOR_TAG)"
  fi
}

send_logs() {
  log "sending demo OTLP logs through motel"
  local env
  for env in dev prod; do
    curl -sS -X POST "http://localhost:$MOTEL_PORT/inputs/otlphttp/input/v1/logs" \
      -H 'Content-Type: application/json' \
      -H "X-Elastic-Project-Id: $TARGET_ID" \
      -d "{\"resourceLogs\":[{\"resource\":{\"attributes\":[{\"key\":\"env\",\"value\":{\"stringValue\":\"$env\"}}]},
         \"scopeLogs\":[{\"logRecords\":[{\"timeUnixNano\":\"$(date +%s)000000000\",
         \"body\":{\"stringValue\":\"hi from $env\"}}]}]}]}" \
      | grep -q 'partialSuccess' || warn "unexpected motel response for env=$env"
  done
}

print_ready() {
  echo
  echo "Local Streams backend is ready. Login: $ES_USER / $ES_PASS"
  echo "  Canvas   ${KIBANA_URL:-http://localhost:5601}/app/streams/new-experience/"
  echo "  Discover ${KIBANA_URL:-http://localhost:5601}/app/discover"
  echo "  Logs     FROM $LOGS_DEV_DS  |  FROM $LOGS_PROD_DS"
  echo "  Metrics  FROM $METRICS_DS"
}

wait_for_data() {
  log "waiting for demo logs and collector metrics"
  local i logs_ok=0 metrics_ok=0
  for i in $(seq 1 24); do
    if [[ "$logs_ok" -eq 0 ]] && { ds_has_docs "$LOGS_DEV_DS" || ds_has_docs "$LOGS_PROD_DS"; }; then
      logs_ok=1
      log "demo logs are in"
    fi
    if [[ "$metrics_ok" -eq 0 ]] && ds_has_docs "$METRICS_DS"; then
      metrics_ok=1
      log "collector metrics are in"
    fi
    if [[ "$logs_ok" -eq 1 && "$metrics_ok" -eq 1 ]]; then
      print_ready
      return 0
    fi
    sleep 5
  done
  if [[ "$logs_ok" -eq 1 ]]; then
    warn "logs landed but $METRICS_DS is still empty (collector telemetry may still be starting)"
    print_ready
    return 0
  fi
  warn "no demo documents yet. Collector logs:"
  kubectl_ctx -n "$UNIT_NS" logs "deploy/$UNIT_ID" --since=5m \
    | grep -E '"log.level":"(warn|error)"' | tail -20 || true
  die "demo data did not appear (see above)"
}

require_stack() {
  detect_es
  detect_kibana
  kubectl_ctx get ns >/dev/null 2>&1 || die "kind context $KUBE_CONTEXT is not reachable. Run: cd streams-controller && make kind"
  [[ -n "$ES" ]] || die "Elasticsearch is not on localhost:9200. Run: pnpm es serverless --projectType=observability"
  [[ -n "$KIBANA_URL" ]] || die "Kibana is not on localhost:5601. Run: pnpm serverless-oblt"
  need kubectl
  need jq
  need python3
  need curl
  resolve_image_tags
}

cmd_setup() {
  require_stack
  ensure_controller_patches
  ensure_es_alias
  ensure_motel
  log "setup done"
}

cmd_seed() {
  require_stack
  ensure_es_alias
  ensure_motel_forward
  mint_api_key
  publish_unit
  patch_artifact_tls
  send_logs
  wait_for_data
}

restore_controller_patches() {
  if [[ -z "${STREAMS_CONTROLLER:-}" || ! -d "$STREAMS_CONTROLLER/.git" ]]; then
    warn "streams-controller checkout not found; skip reverting local patches"
    return 0
  fi
  local files=(dev/values.yaml internal/workload/telemetry.tpl.yml)
  log "reverting local controller patches: ${files[*]}"
  git -C "$STREAMS_CONTROLLER" checkout -- "${files[@]}"
}

reset_canvas_unit() {
  detect_kibana
  if [[ -z "${KIBANA_URL:-}" || -z "${KIBANA_AUTH:-}" ]]; then
    warn "Kibana is not reachable; Canvas will still show the last published unit"
    return 0
  fi
  log "resetting Canvas unit $UNIT_ID (POST $KIBANA_URL/internal/streams/unit/$UNIT_ID/_reset)"
  local body
  body="$(kb_curl -X POST "$KIBANA_URL/internal/streams/unit/$UNIT_ID/_reset" \
    -H 'Content-Type: application/json' -d '{}' || true)"
  if ! printf '%s' "$body" | jq -e '.acknowledged == true' >/dev/null 2>&1; then
    printf '%s\n' "$body" >&2
    warn "Canvas unit reset did not acknowledge; reload /app/streams/new-experience/ after Kibana is up"
  fi
}

cmd_reset() {
  detect_es
  [[ -n "$ES" ]] || die "Elasticsearch is not reachable"
  reset_canvas_unit
  log "deleting demo data streams"
  es_curl -X DELETE "$ES/_data_stream/logs-application.otel-*" >/dev/null || true
  es_curl -X DELETE "$ES/_data_stream/$METRICS_DS" >/dev/null || true
  if kubectl_ctx -n "$UNIT_NS" get "streamunit/$UNIT_ID" >/dev/null 2>&1; then
    log "deleting StreamUnit $UNIT_NS/$UNIT_ID"
    kubectl_ctx -n "$UNIT_NS" delete "streamunit/$UNIT_ID" --wait=true
  fi
  rm -f "$STATE_DIR/api_key" "$STATE_DIR/unit.yaml" "$STATE_DIR/artifact.yaml" "$STATE_DIR/artifact.patched.yaml"
  restore_controller_patches
  log "reset done. Reload Canvas — the graph should be empty. Re-run $0 to stand the demo unit back up."
}

usage() {
  cat <<EOF
Full local Streams backend for UI development.

You start kind, two Tilts, serverless ES, and Kibana. This script publishes the
demo unit, wires motel → collector → ES, and sends traffic.

Usage:
  $0           wire the cluster + publish unit + send traffic
  $0 status    what is running
  $0 setup     motel, ES alias, local controller patches
  $0 seed      publish unit + send traffic
  $0 reset     drop Canvas unit, demo data, StreamUnit CR, and controller patches

Start these yourself and leave them running:
  pnpm es serverless --projectType=observability
  pnpm serverless-oblt
  cd streams-config-distributor && tilt up --context kind-streams -- --port 18443
  cd streams-controller && tilt up --port 10351

Then from the Kibana checkout:
  $0

Edit unit.yaml and re-run to publish a different graph. Keep __API_KEY__
on elasticsearch destinations.

Login: $ES_USER / $ES_PASS (local serverless defaults)

Collector images do not have a :latest tag. The script uses the
streams-collector tag from your streams-controller checkout, and the
motel image already on the cluster. Override with STREAMS_COLLECTOR_TAG
and STREAMS_MOTEL_COLLECTOR_TAG. Minted ES API keys stay in
\$TMPDIR/streams-full-dev and are never committed.
EOF
}

main() {
  local cmd="${1:-all}"
  case "$cmd" in
    -h | --help | help) usage ;;
    status) cmd_status ;;
    setup) cmd_setup ;;
    seed) cmd_seed ;;
    reset) cmd_reset ;;
    all)
      cmd_setup
      cmd_seed
      ;;
    *)
      usage >&2
      exit 1
      ;;
  esac
}

main "$@"
