#!/usr/bin/env bash
# ------------------------------------------------------------------
# Seed K8s OTel data for the Entity-Centric Lab dashboard demo.
#
# Injects synthetic OTel metrics into data streams that the OOTB K8s
# dashboards query. All K8s fields live inside resource.attributes
# (passthrough field) so ES|QL resolves them as k8s.cluster.name etc.
#
# Entity relationships are FIXED so every detail dashboard (cluster,
# node, namespace, pod, deployment) shows consistent, meaningful data.
#
# Entity names match fake_entities.ts:
#   padIndex(i, w) = String(i+1).padStart(w, '0')
#   nodes:       seed=[node-prod-eu-04], fallback=node-001..node-047 (seeded: 001–024)
#   namespaces:  seed=[payments,checkout,fraud,settlement], fallback=ns-05..ns-08
#   pods:        seed=[4 named], fallback=pod-001..pod-593 (seeded: 001–048)
#   deployments: seed=[], fallback=deployment-001..deployment-096 (seeded: 001–024)
#
# NOTE: There is also a "Seed demo data" button in the Kibana UI
# (beaker popover → bottom of the panel) that calls a server-side
# API route doing the same thing. Prefer that for non-local clusters.
#
# Usage:
#   ./seed_k8s_otel_data.sh
#   ES_URL=https://host:9200 ES_USER=elastic ES_PASS=changeme ./seed_k8s_otel_data.sh
# ------------------------------------------------------------------
set -euo pipefail

ES_URL="${ES_URL:-http://localhost:9200}"
ES_USER="${ES_USER:-elastic}"
ES_PASS="${ES_PASS:-changeme}"
AUTH="${ES_USER}:${ES_PASS}"

CDS="metrics-k8sclusterreceiver.otel-default"
KDS="metrics-kubeletstatsreceiver.otel-default"
LDS="logs-k8seventsreceiver.otel-default"

echo "🔧 Elasticsearch: $ES_URL"
echo ""

# ------------------------------------------------------------------
# 1. Check data streams
# ------------------------------------------------------------------
check_ds() {
  local ds=$1
  echo -n "   $ds: "
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" -u "$AUTH" "$ES_URL/_data_stream/$ds" 2>&1)
  if [[ "$code" == "200" ]]; then echo "✅ exists"; else echo "📝 auto-created on first write"; fi
}
echo "📁 Data streams…"
check_ds "$CDS"; check_ds "$KDS"; check_ds "$LDS"
echo ""

# ------------------------------------------------------------------
# 2. Fixed entity topology (matches fake_entities.ts)
# ------------------------------------------------------------------
C1="k8s-eu-prod"; C2="k8s-us-prod"
CLUSTERS=("$C1" "$C2")

# Nodes: seed row + node-001..node-024  (25 total)
# Odd → EU, even → US
NODES=("node-prod-eu-04")
NODE_CLUSTERS=("$C1")
for i in $(seq 1 24); do
  n=$(printf "node-%03d" "$i")
  NODES+=("$n")
  if (( i % 2 == 1 )); then NODE_CLUSTERS+=("$C1"); else NODE_CLUSTERS+=("$C2"); fi
done

# Namespaces: seed rows + fallback ns-05..ns-08  (9 total)
ALL_NS=("payments" "checkout" "fraud" "settlement" "kube-system" "ns-05" "ns-06" "ns-07" "ns-08")
NS_CLUSTER=("$C1"    "$C1"      "$C1"  "$C2"        "$C2"         "$C1"  "$C2"   "$C2"   "$C1")

# Deployments: deployment-001..deployment-024  (24 total)
# Plus named ones for seed-row pods
DEPLOY_NAMES=("payments-api" "checkout-svc" "fraud-detector")
DEPLOY_NS=("payments" "checkout" "fraud")
DEPLOY_CL=("$C1" "$C1" "$C1")
for i in $(seq 1 24); do
  d=$(printf "deployment-%03d" "$i")
  DEPLOY_NAMES+=("$d")
  ns_idx=$(( (i - 1) % ${#ALL_NS[@]} ))
  DEPLOY_NS+=("${ALL_NS[$ns_idx]}")
  DEPLOY_CL+=("${NS_CLUSTER[$ns_idx]}")
done
NUM_DEPLOYS=${#DEPLOY_NAMES[@]}

# Pods: 4 seed rows + pod-001..pod-048  (52 total)
# Each pod is assigned to a node (round-robin), namespace, cluster, deployment
POD_NAMES=("payments-pod-7f9b2" "payments-pod-3ac1f" "batch-settlement-job-xk2p" "fraud-pod-9a1c")
POD_NODES=("node-prod-eu-04"    "node-001"           "node-002"                   "node-003")
POD_NS=("payments"              "payments"           "settlement"                 "fraud")
POD_CL=("$C1"                   "$C1"                "$C2"                        "$C1")
POD_DEPLOY=("payments-api"      "payments-api"       "deployment-001"             "fraud-detector")

for i in $(seq 1 48); do
  p=$(printf "pod-%03d" "$i")
  POD_NAMES+=("$p")
  node_idx=$(( (i - 1) % ${#NODES[@]} ))
  POD_NODES+=("${NODES[$node_idx]}")
  ns_idx=$(( (i - 1) % ${#ALL_NS[@]} ))
  POD_NS+=("${ALL_NS[$ns_idx]}")
  POD_CL+=("${NS_CLUSTER[$ns_idx]}")
  deploy_idx=$(( (i - 1) % NUM_DEPLOYS ))
  POD_DEPLOY+=("${DEPLOY_NAMES[$deploy_idx]}")
done
NUM_PODS=${#POD_NAMES[@]}

# Container names (cycled per pod)
CTR_NAMES=("api-server" "sidecar-proxy" "worker" "nginx-proxy" "redis-cache" "frontend" "backend" "gateway" "scheduler" "logger" "etcd" "prometheus" "batch-proc" "cache" "ingress")
NUM_CTRS=${#CTR_NAMES[@]}

echo "📊 Topology: ${#NODES[@]} nodes, ${#ALL_NS[@]} namespaces, $NUM_DEPLOYS deployments, $NUM_PODS pods"

# ------------------------------------------------------------------
# 3. Timestamps
#    SEED_HOURS  — how many hours of data to generate (default: 8)
#    SEED_INTERVAL — minutes between data points    (default: 5)
# ------------------------------------------------------------------
SEED_HOURS="${SEED_HOURS:-8}"
SEED_INTERVAL="${SEED_INTERVAL:-5}"
NUM_SAMPLES=$(( SEED_HOURS * 60 / SEED_INTERVAL ))

generate_timestamps() {
  local now_epoch; now_epoch=$(date +%s)
  local ts_list=()
  for ((i=0; i<NUM_SAMPLES; i++)); do
    local epoch=$((now_epoch - i * SEED_INTERVAL * 60))
    if [[ "$(uname)" == "Darwin" ]]; then
      ts_list+=("$(date -u -r "$epoch" +"%Y-%m-%dT%H:%M:%S.000Z")")
    else
      ts_list+=("$(date -u -d "@$epoch" +"%Y-%m-%dT%H:%M:%S.000Z")")
    fi
  done
  echo "${ts_list[@]}"
}
read -r -a TIMESTAMPS <<< "$(generate_timestamps)"
echo "📊 Generating ${#TIMESTAMPS[@]} data points over last ${SEED_HOURS}h (every ${SEED_INTERVAL}min)…"

# ------------------------------------------------------------------
# 4. Build bulk body
# ------------------------------------------------------------------
BULK_FILE=$(mktemp)
trap 'rm -f $BULK_FILE' EXIT

rand_range() { echo $(( RANDOM % ($2 - $1) + $1 )); }

POD_PHASES=(2 2 2 2 2 2 2 1 3 4)

for ts in "${TIMESTAMPS[@]}"; do

  # ────────────────────────────────────────────────────────────────
  # CLUSTER RECEIVER — node metrics
  # ────────────────────────────────────────────────────────────────
  for idx in "${!NODES[@]}"; do
    node="${NODES[$idx]}"; cl="${NODE_CLUSTERS[$idx]}"
    cat >> "$BULK_FILE" <<EOF
{"create":{"_index":"$CDS"}}
{"@timestamp":"$ts","resource":{"attributes":{"k8s.cluster.name":"$cl","k8s.node.name":"$node","k8s.node.condition_ready":1,"k8s.node.condition_memory_pressure":0,"k8s.node.cpu.usage":0.$(rand_range 100 900),"k8s.node.memory.available":$(rand_range 8000000000 16000000000),"k8s.node.memory.working_set":$(rand_range 2000000000 8000000000),"k8s.node.memory.rss":$(rand_range 1000000000 6000000000),"k8s.node.allocatable_cpu":$((RANDOM % 4 + 4)).0,"k8s.node.allocatable_memory":$(rand_range 16000000000 32000000000),"k8s.node.filesystem.capacity":107374182400,"k8s.node.filesystem.usage":$(rand_range 20000000000 60000000000),"k8s.node.network.io":$(rand_range 10000000 500000000)}}}
EOF
  done

  # ────────────────────────────────────────────────────────────────
  # CLUSTER RECEIVER — namespace docs (phase=1 → Active)
  # ────────────────────────────────────────────────────────────────
  for idx in "${!ALL_NS[@]}"; do
    ns="${ALL_NS[$idx]}"; cl="${NS_CLUSTER[$idx]}"
    cat >> "$BULK_FILE" <<EOF
{"create":{"_index":"$CDS"}}
{"@timestamp":"$ts","resource":{"attributes":{"k8s.cluster.name":"$cl","k8s.namespace.name":"$ns","k8s.namespace.phase":1}}}
EOF
  done

  # ────────────────────────────────────────────────────────────────
  # CLUSTER RECEIVER — deployment metrics
  # ────────────────────────────────────────────────────────────────
  for idx in "${!DEPLOY_NAMES[@]}"; do
    dname="${DEPLOY_NAMES[$idx]}"; dns="${DEPLOY_NS[$idx]}"; dcl="${DEPLOY_CL[$idx]}"
    desired=$((RANDOM % 3 + 2)); avail=$((RANDOM % desired + 1))
    cat >> "$BULK_FILE" <<EOF
{"create":{"_index":"$CDS"}}
{"@timestamp":"$ts","resource":{"attributes":{"k8s.cluster.name":"$dcl","k8s.namespace.name":"$dns","k8s.deployment.name":"$dname","k8s.deployment.desired":$desired,"k8s.deployment.available":$avail}}}
EOF
  done

  # ────────────────────────────────────────────────────────────────
  # CLUSTER RECEIVER — pod phase + ownership
  # ────────────────────────────────────────────────────────────────
  for idx in "${!POD_NAMES[@]}"; do
    pname="${POD_NAMES[$idx]}"; pnode="${POD_NODES[$idx]}"
    pns="${POD_NS[$idx]}"; pcl="${POD_CL[$idx]}"; pdeploy="${POD_DEPLOY[$idx]}"
    phase="${POD_PHASES[$((RANDOM % ${#POD_PHASES[@]}))]}"
    cat >> "$BULK_FILE" <<EOF
{"create":{"_index":"$CDS"}}
{"@timestamp":"$ts","resource":{"attributes":{"k8s.cluster.name":"$pcl","k8s.namespace.name":"$pns","k8s.node.name":"$pnode","k8s.pod.name":"$pname","k8s.pod.uid":"uid-$pname","k8s.pod.phase":$phase,"k8s.deployment.name":"$pdeploy","k8s.object.name":"$pname","k8s.object.kind":"Pod"}}}
EOF
  done

  # ────────────────────────────────────────────────────────────────
  # CLUSTER RECEIVER — container info (1 container per pod)
  # ────────────────────────────────────────────────────────────────
  for idx in "${!POD_NAMES[@]}"; do
    pname="${POD_NAMES[$idx]}"; pnode="${POD_NODES[$idx]}"
    pns="${POD_NS[$idx]}"; pcl="${POD_CL[$idx]}"
    cname="${CTR_NAMES[$((idx % NUM_CTRS))]}"
    restarts=$((RANDOM % 3))
    cat >> "$BULK_FILE" <<EOF
{"create":{"_index":"$CDS"}}
{"@timestamp":"$ts","resource":{"attributes":{"k8s.cluster.name":"$pcl","k8s.namespace.name":"$pns","k8s.node.name":"$pnode","k8s.pod.name":"$pname","k8s.pod.uid":"uid-$pname","k8s.container.name":"$cname","k8s.container.restarts":$restarts,"k8s.container.ready":true,"k8s.container.cpu_limit":2.0,"k8s.container.cpu_request":0.5,"k8s.container.memory_limit":2147483648,"k8s.container.memory_request":536870912}}}
EOF
  done

  # ────────────────────────────────────────────────────────────────
  # KUBELET STATS — pod resource usage
  # ────────────────────────────────────────────────────────────────
  for idx in "${!POD_NAMES[@]}"; do
    pname="${POD_NAMES[$idx]}"; pnode="${POD_NODES[$idx]}"
    pns="${POD_NS[$idx]}"; pcl="${POD_CL[$idx]}"; pdeploy="${POD_DEPLOY[$idx]}"
    phase="${POD_PHASES[$((RANDOM % ${#POD_PHASES[@]}))]}"
    cat >> "$BULK_FILE" <<EOF
{"create":{"_index":"$KDS"}}
{"@timestamp":"$ts","resource":{"attributes":{"k8s.cluster.name":"$pcl","k8s.namespace.name":"$pns","k8s.node.name":"$pnode","k8s.pod.name":"$pname","k8s.pod.uid":"uid-$pname","k8s.pod.phase":$phase,"k8s.deployment.name":"$pdeploy","k8s.pod.cpu.usage":0.$(rand_range 10 500),"k8s.pod.memory.working_set":$(rand_range 100000000 500000000),"k8s.pod.memory.rss":$(rand_range 80000000 400000000),"k8s.pod.memory.available":$(rand_range 500000000 1500000000),"k8s.pod.memory_limit_utilization":0.$(rand_range 10 80),"k8s.pod.cpu_limit_utilization":0.$(rand_range 5 60),"k8s.pod.network.io":$(rand_range 1000000 50000000)}}}
EOF
  done

  # ────────────────────────────────────────────────────────────────
  # KUBELET STATS — node resource usage
  # ────────────────────────────────────────────────────────────────
  for idx in "${!NODES[@]}"; do
    node="${NODES[$idx]}"; cl="${NODE_CLUSTERS[$idx]}"
    cat >> "$BULK_FILE" <<EOF
{"create":{"_index":"$KDS"}}
{"@timestamp":"$ts","resource":{"attributes":{"k8s.cluster.name":"$cl","k8s.node.name":"$node","k8s.node.cpu.usage":0.$(rand_range 100 900),"k8s.node.memory.working_set":$(rand_range 2000000000 8000000000),"k8s.node.memory.available":$(rand_range 8000000000 16000000000),"k8s.node.memory.rss":$(rand_range 1000000000 6000000000),"k8s.node.filesystem.capacity":107374182400,"k8s.node.filesystem.usage":$(rand_range 20000000000 60000000000),"k8s.node.network.io":$(rand_range 10000000 500000000)}}}
EOF
  done

  # ────────────────────────────────────────────────────────────────
  # KUBELET STATS — volume stats (per pod)
  # ────────────────────────────────────────────────────────────────
  for idx in "${!POD_NAMES[@]}"; do
    pname="${POD_NAMES[$idx]}"; pcl="${POD_CL[$idx]}"; pns="${POD_NS[$idx]}"
    cat >> "$BULK_FILE" <<EOF
{"create":{"_index":"$KDS"}}
{"@timestamp":"$ts","resource":{"attributes":{"k8s.cluster.name":"$pcl","k8s.namespace.name":"$pns","k8s.pod.name":"$pname","k8s.pod.uid":"uid-$pname","k8s.volume.name":"data-vol","k8s.volume.capacity":10737418240,"k8s.volume.available":$(rand_range 2000000000 8000000000)}}}
EOF
  done

  # ────────────────────────────────────────────────────────────────
  # K8S EVENT LOGS
  # ────────────────────────────────────────────────────────────────
  LOG_MSGS=("Pod scheduled on node" "Container started" "Liveness probe failed" "Pulling image" "Back-off restarting" "Readiness probe succeeded" "Volume mounted" "Successfully pulled image" "Scaled up replica set" "Deployment updated")
  LOG_SEVS=("Info" "Info" "Warning" "Info" "Warning" "Info" "Info" "Info" "Info" "Info")
  for ((li=0; li<6; li++)); do
    midx=$((RANDOM % ${#LOG_MSGS[@]}))
    pidx=$((RANDOM % NUM_PODS))
    cat >> "$BULK_FILE" <<EOF
{"create":{"_index":"$LDS"}}
{"@timestamp":"$ts","body":{"text":"${LOG_MSGS[$midx]}"},"severity_text":"${LOG_SEVS[$midx]}","resource":{"attributes":{"k8s.cluster.name":"${POD_CL[$pidx]}","k8s.namespace.name":"${POD_NS[$pidx]}","k8s.pod.name":"${POD_NAMES[$pidx]}","k8s.node.name":"${POD_NODES[$pidx]}","k8s.object.name":"${POD_NAMES[$pidx]}","k8s.object.kind":"Pod"}}}
EOF
  done

done

DOC_COUNT=$(grep -c '"create"' "$BULK_FILE")
FILE_SIZE=$(du -h "$BULK_FILE" | cut -f1)
echo "   Generated $DOC_COUNT documents ($FILE_SIZE)"

# ------------------------------------------------------------------
# 5. Bulk index
# ------------------------------------------------------------------
echo ""
echo "📤 Indexing…"
TOTAL_LINES=$(wc -l < "$BULK_FILE")
SUCCESS=0; FAIL=0
start=1
while [ $start -lt $TOTAL_LINES ]; do
  end=$((start + 999))
  [ $end -gt $TOTAL_LINES ] && end=$TOTAL_LINES
  chunk=$(sed -n "${start},${end}p" "$BULK_FILE")
  resp=$(echo "$chunk" | curl -sS -w "\n%{http_code}" -u "$AUTH" -X POST "$ES_URL/_bulk" -H "Content-Type: application/x-ndjson" --data-binary @- 2>&1)
  code=$(echo "$resp" | tail -1); body=$(echo "$resp" | sed '$d')
  if [[ "$code" =~ ^2 ]]; then
    ok=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(sum(1 for i in d.get('items',[]) if i.get('create',{}).get('status',0) in (200,201)))" 2>/dev/null || echo "0")
    err=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(sum(1 for i in d.get('items',[]) if i.get('create',{}).get('status',0) not in (200,201)))" 2>/dev/null || echo "0")
    SUCCESS=$((SUCCESS + ok)); FAIL=$((FAIL + err))
    echo -n "."
  else
    echo ""; echo "   ❌ Chunk failed (HTTP $code)"
    FAIL=$((FAIL + 500))
  fi
  start=$((end + 1))
done
echo ""
[ $FAIL -eq 0 ] && echo "   ✅ All $SUCCESS documents indexed" || echo "   ⚠️  $SUCCESS ok, $FAIL failed"

# ------------------------------------------------------------------
# 6. Refresh & verify
# ------------------------------------------------------------------
echo ""
echo "🔄 Refreshing…"
curl -sS -u "$AUTH" -X POST "$ES_URL/$CDS,$KDS,$LDS/_refresh" > /dev/null 2>&1 || true
echo ""
echo "📈 Verification:"
for ds in "$CDS" "$KDS" "$LDS"; do
  count=$(curl -sS -u "$AUTH" "$ES_URL/$ds/_count" -H 'Content-Type: application/json' 2>&1 | python3 -c "import sys,json; print(json.load(sys.stdin).get('count',0))" 2>/dev/null || echo "?")
  echo "   $ds: $count docs"
done

echo ""
echo "🔗 Entity topology:"
echo "   Clusters: $C1, $C2"
echo "   Nodes: ${#NODES[@]}  (node-prod-eu-04 + node-001..node-024)"
echo "   Namespaces: ${#ALL_NS[@]}  (${ALL_NS[*]})"
echo "   Deployments: $NUM_DEPLOYS  (payments-api, checkout-svc, fraud-detector + deployment-001..024)"
echo "   Pods: $NUM_PODS  (4 seed + pod-001..pod-048)"
echo ""
echo "⚠️  Network I/O panels using RATE() will show errors — they need"
echo "   counter_long metric type which requires real OTel receiver data."
echo ""
echo "✅ Done! Set time range to 'Last 30 minutes'."
