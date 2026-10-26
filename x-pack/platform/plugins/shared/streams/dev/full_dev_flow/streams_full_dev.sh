#!/usr/bin/env bash
# Full local Streams backend for UI development.
#
# You start kind, two Tilts, serverless ES, and Kibana. Then:
#   setup  — local patches, motel ingest + index collectors, print managed_otlp.url
#   seed   — publish a unit, mint keys, send ~100 docs (some failure-store)
#   test_ui_flow — prompt for a UI source endpoint + API key and send docs
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
# resolve from the controller checkout (helm tag or go.mod pin), a Ready
# motel pod, or ../hosted-otel-collector HEAD. Override with STREAMS_COLLECTOR_TAG
# / STREAMS_MOTEL_COLLECTOR_TAG.
COLLECTOR_TAG="${STREAMS_COLLECTOR_TAG:-}"
MOTEL_COLLECTOR_TAG="${STREAMS_MOTEL_COLLECTOR_TAG:-}"
MOTEL_NS="motel-ingest-collector"
INDEX_NS="motel-index-collector"
MOTEL_PORT="${STREAMS_MOTEL_PORT:-14318}"
MANAGED_OTLP_URL="http://localhost:${MOTEL_PORT}"
SOURCE_ID="${STREAMS_SOURCE_ID:-input}"
LOGS_DEV_DS="logs-application.otel-dev"
LOGS_PROD_DS="logs-application.otel-prod"
METRICS_DS="metrics-streams.otel-default"
ES_USER="${ES_USER:-elastic_serverless}"
ES_PASS="${ES_PASS:-changeme}"
CA="${CA:-$REPO_ROOT/src/platform/packages/shared/kbn-dev-utils/certs/ca.crt}"

STREAMS_CONTROLLER="${STREAMS_CONTROLLER:-$(cd "$REPO_ROOT/../streams-controller" 2>/dev/null && pwd || true)}"
STREAMS_HOSTED_OTEL_COLLECTOR="${STREAMS_HOSTED_OTEL_COLLECTOR:-$(cd "$REPO_ROOT/../hosted-otel-collector" 2>/dev/null && pwd || true)}"

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

# git-<12> from the checkout HEAD (the commit after a rebase), then
# upstream/main, then origin/main. origin/main is wrong when the checkout
# is a fork whose main still predates kafkatopicprocessor.conditionals.
git_image_tag() {
  local repo="$1" sha
  [[ -n "$repo" && -d "$repo/.git" ]] || return 0
  sha="$(git -C "$repo" rev-parse --short=12 HEAD 2>/dev/null || true)"
  if [[ -z "$sha" ]]; then
    sha="$(git -C "$repo" rev-parse --short=12 upstream/main 2>/dev/null \
      || git -C "$repo" rev-parse --short=12 origin/main 2>/dev/null \
      || true)"
  fi
  [[ -n "$sha" ]] || return 0
  printf 'git-%s' "$sha"
}

# streams-collector tag: helm pin if present, else the streams-transpiler
# commit in go.mod (same rule the controller uses at runtime).
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
    if match and match.group(1) not in ("", "latest"):
        print(match.group(1))
        raise SystemExit(0)

go_mod = root / "go.mod"
if go_mod.exists():
    match = re.search(
        r"github.com/elastic/streams-transpiler\s+v\d+\.\d+\.\d+-(?:.*\.)?\d{14}-([0-9a-f]{12})",
        go_mod.read_text(),
    )
    if match:
        print("git-" + match.group(1))
PY
}

deploy_image_tag() {
  local ns="$1" deploy="$2" image tag
  # Only reuse a Ready container. CrashLoop pods still have phase=Running and
  # the Deployment spec may be an image that rejects motel.yaml (for example
  # kafkatopicprocessor without conditionals).
  image="$(kubectl_ctx -n "$ns" get pods -l "app=$deploy" -o json 2>/dev/null \
    | jq -r '.items[]
        | select(.status.containerStatuses[0].ready == true)
        | .spec.containers[0].image' \
    | grep -v ':latest$' | head -1 || true)"
  [[ "$image" == *:* ]] || return 0
  tag="${image##*:}"
  [[ -n "$tag" && "$tag" != "latest" ]] || return 0
  printf '%s' "$tag"
}

resolve_image_tags() {
  local helm_tag running_motel motel_git_tag
  helm_tag="$(controller_streams_collector_tag || true)"
  if [[ -z "$COLLECTOR_TAG" ]]; then
    COLLECTOR_TAG="$helm_tag"
  fi
  if [[ -z "$MOTEL_COLLECTOR_TAG" ]]; then
    running_motel="$(deploy_image_tag "$MOTEL_NS" motel-ingest-collector || true)"
    motel_git_tag="$(git_image_tag "${STREAMS_HOSTED_OTEL_COLLECTOR:-}" || true)"
    MOTEL_COLLECTOR_TAG="${running_motel:-$motel_git_tag}"
  fi
  [[ -n "$MOTEL_COLLECTOR_TAG" && "$MOTEL_COLLECTOR_TAG" != "latest" ]] \
    || die "no motel image tag (observability-ci has no :latest). Set STREAMS_MOTEL_COLLECTOR_TAG or clone hosted-otel-collector next to kibana"
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
    ok "motel ingest Deployment"
  else
    missing "motel ingest Deployment"
  fi
  if kubectl_ctx -n "$INDEX_NS" get deploy motel-index-collector >/dev/null 2>&1; then
    ok "motel index Deployment"
  else
    missing "motel index Deployment"
  fi
  if curl -s --max-time 1 -o /dev/null -w '%{http_code}' "http://localhost:$MOTEL_PORT" 2>/dev/null | grep -qv '^000$'; then
    ok "motel port-forward localhost:$MOTEL_PORT"
    ok "xpack.cloud.managed_otlp.url: \"$MANAGED_OTLP_URL\""
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

image_repo = (
    "    image:\n"
    "      repository: docker.elastic.co/observability-ci/streams-collector\n"
)
image_block = re.search(
    r"(    image:\n      repository: docker\.elastic\.co/observability-ci/streams-collector\n)(      tag: )(\S+)",
    text,
)
if image_block:
    current_tag = image_block.group(3)
    if tag and current_tag != tag:
        text = (
            text[: image_block.start()]
            + image_block.group(1)
            + image_block.group(2)
            + tag
            + text[image_block.end() :]
        )
        changed = True
        print(f"patched collector image tag -> {tag}")
    elif current_tag == "latest" and not tag:
        sys.exit(
            "dev/values.yaml has streams-collector:latest (not published). "
            "Set STREAMS_COLLECTOR_TAG or restore helm/values.yaml"
        )
elif image_repo in text and tag:
    text = text.replace(image_repo, image_repo + f"      tag: {tag}\n", 1)
    changed = True
    print(f"patched collector image tag -> {tag}")
elif "repository: docker.elastic.co/observability-ci/streams-collector" not in text:
    sys.exit("could not find processing.image.repository in dev/values.yaml")

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

if "user: motel-index-collector" not in text:
    marker = (
        "            name: motel.events.metrics.{targetID}\n"
        "            operations: [write, describe]\n"
    )
    acl = """            name: motel.events.metrics.{targetID}
            operations: [write, describe]
      - user: motel-index-collector
        permissions:
          - resource: topic
            name: motel.events.metrics.{targetID}
            operations: [read, describe]
          - resource: group
            name: motel-index-collector
            operations: [read, describe]
"""
    if marker not in text:
        sys.exit("could not insert motel-index-collector Kafka ACL in dev/values.yaml")
    text = text.replace(marker, acl, 1)
    changed = True
    print("patched motel-index-collector Kafka read ACL")

path.write_text(text)
if not changed:
    print("controller values already patched")
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

ensure_index_collector() {
  log "ensuring motel-index-collector (Kafka metrics → $METRICS_DS)"
  local rendered="$STATE_DIR/index.yaml"
  sed -e "s/__COLLECTOR_TAG__/$MOTEL_COLLECTOR_TAG/g" \
      -e "s/__TARGET_ID__/$TARGET_ID/g" \
      "$ASSETS/index.yaml" > "$rendered"
  kubectl_ctx apply -f "$rendered" >/dev/null
  if [[ -n "${STREAMS_CONTROLLER:-}" && -x "$STREAMS_CONTROLLER/dev/registry-secret.sh" ]]; then
    NAMESPACE="$INDEX_NS" bash "$STREAMS_CONTROLLER/dev/registry-secret.sh"
  else
    warn "could not create index-collector image pull secret; set STREAMS_CONTROLLER or run docker login + registry-secret.sh"
  fi
  kubectl_ctx -n "$INDEX_NS" rollout status deploy/motel-index-collector --timeout=180s
}

motel_reachable() {
  curl -s --max-time 1 -o /dev/null -w '%{http_code}' "http://localhost:$MOTEL_PORT" 2>/dev/null \
    | grep -qv '^000$'
}

ensure_motel_forward() {
  if motel_reachable; then
    log "motel already reachable on localhost:$MOTEL_PORT"
    return 0
  fi
  local pid_file="$STATE_DIR/motel-port-forward.pid"
  if [[ -f "$pid_file" ]]; then
    local old_pid
    old_pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "${old_pid:-}" ]] && kill -0 "$old_pid" 2>/dev/null; then
      log "waiting for existing motel port-forward (pid $old_pid)"
    else
      rm -f "$pid_file"
    fi
  fi
  if ! motel_reachable; then
    log "starting motel port-forward localhost:$MOTEL_PORT → $MOTEL_NS/svc:8443"
    # Survive this script exiting so setup can print the URL and return.
    nohup kubectl --context "$KUBE_CONTEXT" -n "$MOTEL_NS" \
      port-forward svc/motel-ingest-collector "$MOTEL_PORT:8443" \
      >"$STATE_DIR/motel-port-forward.log" 2>&1 &
    echo $! > "$pid_file"
    disown $! 2>/dev/null || true
  fi
  local i
  for i in $(seq 1 20); do
    if motel_reachable; then
      return 0
    fi
    sleep 0.5
  done
  warn "motel port-forward did not come up; see $STATE_DIR/motel-port-forward.log"
}

print_managed_otlp_setting() {
  echo
  echo "Add this to config/kibana.dev.yml and restart Kibana:"
  echo
  echo "xpack.cloud.managed_otlp.url: \"$MANAGED_OTLP_URL\""
  echo
  echo "OTLP sources in Map then mint endpoints under $MANAGED_OTLP_URL/inputs/otlp/<source-id>/v1/{logs,metrics,traces}."
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

mint_source_api_key() {
  if [[ -f "$STATE_DIR/source_api_key" && -s "$STATE_DIR/source_api_key" ]]; then
    SOURCE_KEY="$(cat "$STATE_DIR/source_api_key")"
    log "reusing source API key in $STATE_DIR/source_api_key"
    return 0
  fi
  log "creating source-scoped API key for $SOURCE_ID"
  local body
  body="$(kb_curl -X POST "$KIBANA_URL/internal/streams/sources/api_key" \
    -H 'Content-Type: application/json' \
    -d "{\"sourceId\":\"$SOURCE_ID\",\"sourceTypeSlug\":\"otlp\"}")"
  SOURCE_KEY="$(printf '%s' "$body" | jq -r '.encodedApiKey // empty')"
  if [[ -z "$SOURCE_KEY" || "$SOURCE_KEY" == "null" ]]; then
    printf '%s\n' "$body" >&2
    die "failed to mint a source API key (does elastic_serverless have ingest_source_manager / manage_own_api_key?)"
  fi
  printf '%s' "$SOURCE_KEY" > "$STATE_DIR/source_api_key"
  chmod 600 "$STATE_DIR/source_api_key"
}

enable_failure_store() {
  local ds="$1"
  es_curl -X PUT "$ES/_data_stream/$ds/_options" \
    -H 'Content-Type: application/json' \
    -d '{"failure_store":{"enabled":true}}' >/dev/null 2>&1 \
    || warn "could not enable failure store on $ds (it may not exist yet)"
}

normalize_otlp_logs_url() {
  local url="${1%/}"
  url="${url%/v1/metrics}"
  url="${url%/v1/traces}"
  url="${url%/v1/logs}"
  printf '%s/v1/logs' "$url"
}

post_otlp_payload() {
  local url="$1" key="${2:-}" payload="$3"
  local args=(-sS -X POST "$url" -H 'Content-Type: application/json' -H "X-Elastic-Project-Id: $TARGET_ID")
  if [[ -n "$key" ]]; then
    args+=(-H "Authorization: ApiKey $key")
  fi
  curl "${args[@]}" -d "$payload"
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
  python3 - "$artifact" "$patched" "$CA" <<'PY'
from pathlib import Path
import sys

src, dst, cert_path = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
endpoint = "        endpoint: ${env:STREAMS_ES_ENDPOINT}"
tls_lines = [
    "        tls:\n",
    "            server_name_override: host.docker.internal\n",
    "            ca_pem: |\n",
]
tls_lines.extend(f"                {line}" for line in cert_path.read_text().splitlines(True))
if tls_lines[-1][-1] != "\n":
    tls_lines[-1] += "\n"

lines = src.read_text().splitlines(True)
out = []
i = 0
while i < len(lines):
    out.append(lines[i])
    if lines[i].rstrip("\n") == endpoint:
        i += 1
        while i < len(lines) and lines[i].rstrip("\n") == "        tls:":
            i += 1
            while i < len(lines) and (
                lines[i].startswith("            ") or lines[i].strip() == ""
            ):
                i += 1
        out.extend(tls_lines)
        continue
    i += 1
dst.write_text("".join(out))
PY
  kubectl_ctx -n "$UNIT_NS" patch "streamunit/$UNIT_ID" --type=merge \
    -p "{\"spec\":{\"artifact\":$(jq -Rs . < "$patched")}}" >/dev/null
  log "waiting for collector Deployment $UNIT_NS/$UNIT_ID rollout"
  if ! kubectl_ctx -n "$UNIT_NS" rollout status "deployment/$UNIT_ID" --timeout=180s; then
    warn "collector did not become ready. Recent logs:"
    kubectl_ctx -n "$UNIT_NS" logs "deploy/$UNIT_ID" --tail=30 || true
    die "collector rollout failed (unknown otlp_http: image is too old; set STREAMS_COLLECTOR_TAG)"
  fi
}

# Map save republishes the unit and drops the local ES TLS block.
ensure_unit_tls() {
  if ! kubectl_ctx -n "$UNIT_NS" get "streamunit/$UNIT_ID" >/dev/null 2>&1; then
    die "no StreamUnit $UNIT_NS/$UNIT_ID. Save the map first."
  fi
  ensure_es_alias
  patch_artifact_tls
}

# body.text is a keyword on OTEL logs, so match_phrase on a marker substring misses.
marker_prefix_query() {
  jq -n --arg m "$1" '{query:{prefix:{"body.text":$m}}}'
}

count_marker_docs() {
  local marker="$1"
  local q main fail
  q="$(marker_prefix_query "$marker")"
  main="$(es_curl "$ES/logs-*/_count" -H 'Content-Type: application/json' -d "$q" | jq -r '.count // 0')"
  fail="$(es_curl "$ES/logs-*::failures/_count" -H 'Content-Type: application/json' -d "$q" \
    | jq -r '.count // 0')"
  printf '%s %s' "${main:-0}" "${fail:-0}"
}

wait_for_marker_docs() {
  local marker="$1"
  log "waiting for marker $marker in logs-* (body.text prefix; OTEL stores it as keyword)"
  local i main fail
  detect_es
  for i in $(seq 1 24); do
    read -r main fail <<<"$(count_marker_docs "$marker")"
    if [[ "${main:-0}" -gt 0 || "${fail:-0}" -gt 0 ]]; then
      log "$((main + fail)) docs with that marker ($main in logs-*, $fail in ::failures)"
      es_curl "$ES/logs-*/_search?size=0" -H 'Content-Type: application/json' \
        -d "$(jq -n --arg m "$marker" '{query:{prefix:{"body.text":$m}},aggs:{idx:{terms:{field:"_index",size:20}}}}')" \
        | jq -r '.aggregations.idx.buckets[]? | "    \(.key)  \(.doc_count)"'
      return 0
    fi
    sleep 5
  done
  warn "marker did not appear. Collector errors:"
  kubectl_ctx -n "$UNIT_NS" logs "deploy/$UNIT_ID" --since=5m \
    | grep -E '"log.level":"(warn|error)"' | tail -20 || true
  return 1
}

# OTEL logs flatten resource/attribute maps, so an OTLP type-conflict never
# reaches the destination failure store. Write a bad @timestamp after the
# valid docs have created the data stream.
index_failure_docs() {
  local ds="$1" env="$2" start="$3" count="${4:-5}" i
  detect_es
  [[ -n "$ES" ]] || die "Elasticsearch is not reachable"
  for i in $(seq "$start" $((start + count - 1))); do
    es_curl -X POST "$ES/$ds/_doc?refresh=true" \
      -H 'Content-Type: application/json' \
      -d "$(jq -n --arg env "$env" --arg n "$i" \
        '{
          "@timestamp": "not-a-timestamp",
          "body": {"text": ("failure-store doc " + $n)},
          "resource": {"attributes": {
            "env": $env,
            "service.name": "streams-full-dev"
          }}
        }')" >/dev/null \
      || warn "could not write failure-store doc $i to $ds"
  done
}

send_logs() {
  log "sending 100 docs through motel as source $SOURCE_ID (90 ok OTLP, 10 failure-store)"
  local url payload i
  url="$(normalize_otlp_logs_url "$MANAGED_OTLP_URL/inputs/otlp/$SOURCE_ID")"
  motel_reachable || die "motel is not reachable on localhost:$MOTEL_PORT. Run: $0 setup"
  payload="$(python3 <<'PY'
import json, time
now = int(time.time() * 1e9)

def envelope(env, records):
    return {
        "resource": {"attributes": [
            {"key": "env", "value": {"stringValue": env}},
            {"key": "service.name", "value": {"stringValue": "streams-full-dev"}},
        ]},
        "scopeLogs": [{"logRecords": records}],
    }

def ok_record(i, env):
    return {
        "timeUnixNano": str(now + i),
        "severityText": "INFO",
        "body": {"stringValue": f"hi from {env} doc {i}"},
        "attributes": [{"key": "doc.id", "value": {"stringValue": str(i)}}],
    }

print(json.dumps({"resourceLogs": [
    envelope("dev", [ok_record(i, "dev") for i in range(45)]),
    envelope("prod", [ok_record(i, "prod") for i in range(45, 90)]),
]}))
PY
)"
  post_otlp_payload "$url" "${SOURCE_KEY:-}" "$payload" \
    | grep -q 'partialSuccess' || warn "unexpected motel response for the 90 valid docs"
  for i in $(seq 1 24); do
    if ds_has_docs "$LOGS_DEV_DS" && ds_has_docs "$LOGS_PROD_DS"; then
      break
    fi
    sleep 1
  done
  enable_failure_store "$LOGS_DEV_DS"
  enable_failure_store "$LOGS_PROD_DS"
  log "writing 10 failure-store docs (invalid @timestamp on $LOGS_DEV_DS / $LOGS_PROD_DS)"
  index_failure_docs "$LOGS_DEV_DS" dev 90 5
  index_failure_docs "$LOGS_PROD_DS" prod 95 5
}

print_ready() {
  echo
  echo "Local Streams backend is ready. Login: $ES_USER / $ES_PASS"
  echo "  Canvas   ${KIBANA_URL:-http://localhost:5601}/app/streams/new-experience/"
  echo "  Discover ${KIBANA_URL:-http://localhost:5601}/app/discover"
  echo "  Logs     FROM $LOGS_DEV_DS  |  FROM $LOGS_PROD_DS"
  echo "  Failures FROM $LOGS_DEV_DS::failures  |  FROM $LOGS_PROD_DS::failures"
  echo "  Metrics  FROM $METRICS_DS"
}

ds_has_failures() {
  local ds="$1"
  [[ -n "$ES" ]] && es_curl "$ES/${ds}::failures/_count" 2>/dev/null | jq -e '.count > 0' >/dev/null 2>&1
}

wait_for_data() {
  log "waiting for demo logs, failure-store docs, and collector metrics"
  local i logs_ok=0 fail_ok=0 metrics_ok=0
  for i in $(seq 1 24); do
    if [[ "$logs_ok" -eq 0 ]] && { ds_has_docs "$LOGS_DEV_DS" || ds_has_docs "$LOGS_PROD_DS"; }; then
      logs_ok=1
      log "demo logs are in"
    fi
    if [[ "$fail_ok" -eq 0 ]] && { ds_has_failures "$LOGS_DEV_DS" || ds_has_failures "$LOGS_PROD_DS"; }; then
      fail_ok=1
      log "failure-store docs are in"
    fi
    if [[ "$metrics_ok" -eq 0 ]] && ds_has_docs "$METRICS_DS"; then
      metrics_ok=1
      log "collector metrics are in"
    fi
    if [[ "$logs_ok" -eq 1 && "$fail_ok" -eq 1 && "$metrics_ok" -eq 1 ]]; then
      print_ready
      return 0
    fi
    sleep 5
  done
  if [[ "$logs_ok" -eq 1 ]]; then
    [[ "$fail_ok" -eq 1 ]] || warn "logs landed but no docs in $LOGS_DEV_DS::failures or $LOGS_PROD_DS::failures"
    if [[ "$metrics_ok" -eq 0 ]]; then
      warn "logs landed but $METRICS_DS is still empty"
      warn "index-collector logs:"
      kubectl_ctx -n "$INDEX_NS" logs deploy/motel-index-collector --since=5m --tail=30 || true
    fi
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
  ensure_index_collector
  log "setup done"
  print_managed_otlp_setting
}

cmd_seed() {
  require_stack
  ensure_controller_patches
  ensure_es_alias
  ensure_motel
  ensure_index_collector
  mint_api_key
  publish_unit
  patch_artifact_tls
  mint_source_api_key
  send_logs
  wait_for_data
}

prompt_test_ui_flow_secrets() {
  if [[ -n "${STREAMS_TEST_ENDPOINT:-}" && -n "${STREAMS_TEST_API_KEY:-}" ]]; then
    TEST_ENDPOINT="$STREAMS_TEST_ENDPOINT"
    TEST_API_KEY="$STREAMS_TEST_API_KEY"
    return 0
  fi
  if [[ ! -t 0 ]]; then
    die "test_ui_flow needs a terminal, or set STREAMS_TEST_ENDPOINT and STREAMS_TEST_API_KEY"
  fi
  printf 'Source endpoint URL (from Map, logs or base): '
  IFS= read -r TEST_ENDPOINT
  printf 'Source API key (encoded, from Generate key): '
  IFS= read -rs TEST_API_KEY
  printf '\n'
  [[ -n "$TEST_ENDPOINT" ]] || die "empty endpoint URL"
  [[ -n "$TEST_API_KEY" ]] || die "empty API key"
}

artifact_has_es_tls() {
  kubectl_ctx -n "$UNIT_NS" get "streamunit/$UNIT_ID" -o jsonpath='{.spec.artifact}' 2>/dev/null \
    | grep -q 'server_name_override: host.docker.internal'
}

collector_dropping_tls() {
  kubectl_ctx -n "$UNIT_NS" logs "deploy/$UNIT_ID" --since=3m 2>/dev/null \
    | grep -q 'certificate is valid for host.docker.internal'
}

send_ui_flow_docs() {
  local url="$1" key="$2" ok_payload="$3" fail_payload="$4" marker="${5:-}"
  local i main fail
  post_otlp_payload "$url" "$key" "$ok_payload" \
    | grep -q 'partialSuccess' || die "motel rejected the 90 valid docs"
  # Let the string `env` mapping land before the object `env` docs, otherwise
  # the 90 valid records go to the failure store.
  if [[ -n "$marker" ]]; then
    for i in $(seq 1 10); do
      read -r main fail <<<"$(count_marker_docs "$marker")"
      if [[ "${main:-0}" -gt 0 ]]; then
        break
      fi
      sleep 1
    done
  else
    sleep 2
  fi
  post_otlp_payload "$url" "$key" "$fail_payload" \
    | grep -q 'partialSuccess' || warn "motel rejected the 10 failure-store docs (they must still reach the collector to fail at ES)"
}

cmd_test_ui_flow() {
  require_stack
  ensure_motel_forward
  motel_reachable || die "motel is not reachable on localhost:$MOTEL_PORT. Run: $0 setup"
  # Prompt first: Generate key / Map save republishes the unit and drops TLS.
  prompt_test_ui_flow_secrets
  ensure_unit_tls
  local url marker
  url="$(normalize_otlp_logs_url "$TEST_ENDPOINT")"
  marker="streams-ui-flow-$(date +%s)"
  log "sending 100 OTLP logs to $url (90 ok, 10 mapping-conflict for failure store)"
  local payload
  payload="$(python3 - "$marker" <<'PY'
import json, sys, time
marker = sys.argv[1]
now = int(time.time() * 1e9)

def envelope(resource_attrs, records):
    return {
        "resourceLogs": [{
            "resource": {"attributes": resource_attrs},
            "scopeLogs": [{"logRecords": records}],
        }]
    }

ok_records = []
for i in range(90):
    env = "prod" if i % 10 == 0 else "dev"
    ok_records.append({
        "timeUnixNano": str(now + i),
        "severityText": "INFO",
        "body": {"stringValue": f"{marker} doc {i} env={env}"},
        "attributes": [{"key": "doc.id", "value": {"stringValue": str(i)}}],
    })
# Successful docs map resource.attributes.env as a keyword. These send env as an
# object so Elasticsearch rejects them into the destination failure store.
fail_records = []
for i in range(90, 100):
    fail_records.append({
        "timeUnixNano": str(now + i),
        "severityText": "ERROR",
        "body": {"stringValue": f"{marker} failure-store doc {i}"},
        "attributes": [{"key": "doc.id", "value": {"stringValue": str(i)}}],
    })
print(json.dumps({
    "ok": envelope([
        {"key": "service.name", "value": {"stringValue": "streams-ui-flow"}},
        {"key": "env", "value": {"stringValue": "dev"}},
    ], ok_records),
    "fail": envelope([
        {"key": "service.name", "value": {"stringValue": "streams-ui-flow"}},
        {"key": "env", "value": {"kvlistValue": {"values": [
            {"key": "nested", "value": {"stringValue": "mapping-conflict"}},
        ]}}},
    ], fail_records),
}))
PY
)"
  local ok_payload fail_payload
  ok_payload="$(printf '%s' "$payload" | jq -c .ok)"
  fail_payload="$(printf '%s' "$payload" | jq -c .fail)"
  send_ui_flow_docs "$url" "$TEST_API_KEY" "$ok_payload" "$fail_payload" "$marker"
  echo
  echo "Sent 100 logs with marker $marker"
  echo "  Valid:          body.text prefix \"$marker\" on the destination index"
  echo "  Failure store:  FROM <your-dest-index>::failures  (env type conflict)"
  if wait_for_marker_docs "$marker"; then
    return 0
  fi
  if collector_dropping_tls || ! artifact_has_es_tls; then
    warn "Map republished and dropped local ES TLS. Re-applying and sending once more."
    ensure_unit_tls
    send_ui_flow_docs "$url" "$TEST_API_KEY" "$ok_payload" "$fail_payload" "$marker"
    if wait_for_marker_docs "$marker"; then
      return 0
    fi
  fi
  echo "If nothing lands, the source must be connected to a destination on the map and saved."
  echo "Do not save Map while this command is sending — that republish wipes the TLS patch."
  die "UI-flow docs did not appear in logs-*"
}

restore_controller_patches() {
  if [[ -z "${STREAMS_CONTROLLER:-}" || ! -d "$STREAMS_CONTROLLER/.git" ]]; then
    warn "streams-controller checkout not found; skip reverting local patches"
    return 0
  fi
  local files=(dev/values.yaml)
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
  rm -f "$STATE_DIR/api_key" "$STATE_DIR/source_api_key" "$STATE_DIR/unit.yaml" \
    "$STATE_DIR/artifact.yaml" "$STATE_DIR/artifact.patched.yaml"
  restore_controller_patches
  log "reset done. Reload Canvas — the graph should be empty. Re-run $0 to stand the demo unit back up."
}

usage() {
  cat <<EOF
Full local Streams backend for UI development.

Start these yourself and leave them running:
  pnpm es serverless --projectType=observability
  pnpm serverless-oblt
  cd streams-config-distributor && tilt up --context kind-streams -- --port 18443
  cd streams-controller && tilt up --port 10351

Then from the Kibana checkout:

Usage:
  $0 setup          local patches, motel ingest + index collectors, print managed_otlp.url
  $0 seed           publish unit, mint dest + source API keys, send 100 docs (90 ok, 10 failures)
  $0 test_ui_flow   prompt for a Map source endpoint + API key, send 100 docs
  $0 status         what is running
  $0 reset          drop Map unit, demo data, StreamUnit CR, controller patches
  $0                setup + seed

Edit unit.yaml and re-run seed to publish a different graph. Keep __API_KEY__
on elasticsearch destinations. Source id defaults to "input" (STREAMS_SOURCE_ID).

Login: $ES_USER / $ES_PASS (local serverless defaults)

Collector images do not have a :latest tag. The script uses the
streams-collector tag from your streams-controller checkout (helm pin or
go.mod streams-transpiler commit), and a Ready motel image on the cluster
or git-<12> of ../hosted-otel-collector HEAD. Override with
STREAMS_COLLECTOR_TAG and STREAMS_MOTEL_COLLECTOR_TAG. Minted ES API keys
stay in \$TMPDIR/streams-full-dev and are never committed.
EOF
}

main() {
  local cmd="${1:-all}"
  case "$cmd" in
    -h | --help | help) usage ;;
    status) cmd_status ;;
    setup) cmd_setup ;;
    seed) cmd_seed ;;
    test_ui_flow | test-ui-flow) cmd_test_ui_flow ;;
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
