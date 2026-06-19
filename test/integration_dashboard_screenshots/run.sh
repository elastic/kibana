#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a; source "$SCRIPT_DIR/.env"; set +a
fi

CMD="${1:-screenshot}"

wait_for_kibana() {
  local kibana_url="${KIBANA_URL:-http://localhost:5601}"

  echo "Waiting for Kibana at $kibana_url ..."
  until curl -sk "$kibana_url/api/status" 2>/dev/null | grep -q '"overall"'; do
    sleep 5
  done
  echo "Kibana is ready."
}

CONTAINER_NAME="dashboard-screenshots-run"

cleanup_container() {
  if docker container inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
    echo ""
    echo "Stopping Docker container $CONTAINER_NAME ..."
    docker stop -t 10 "$CONTAINER_NAME" >/dev/null 2>&1 || true
  fi
}

run_playwright() {
  local image="dashboard-screenshots"
  if ! docker image inspect "$image" >/dev/null 2>&1; then
    echo "Building Playwright Docker image..."
    docker build -t "$image" "$SCRIPT_DIR"
  fi

  local kibana_url="${KIBANA_URL:-http://localhost:5601}"
  if echo "$kibana_url" | grep -qE '(localhost|127\.0\.0\.1)'; then
    kibana_url=$(echo "$kibana_url" | sed 's/localhost/host.docker.internal/g; s/127\.0\.0\.1/host.docker.internal/g')
  fi

  trap cleanup_container EXIT INT TERM

  docker run --rm \
    --name "$CONTAINER_NAME" \
    --init \
    --add-host=host.docker.internal:host-gateway \
    --shm-size=4g \
    -e KIBANA_URL="$kibana_url" \
    -e ES_USER="${ES_USER:-elastic}" \
    -e ES_PASSWORD="${ES_PASSWORD:-changeme}" \
    -e PW_WORKERS="${PW_WORKERS:-4}" \
    -v "$SCRIPT_DIR/playwright.config.ts:/work/playwright.config.ts" \
    -v "$SCRIPT_DIR/tests:/work/tests" \
    -v "$SCRIPT_DIR/screenshots:/work/screenshots" \
    -v "$SCRIPT_DIR/.test-artifacts:/work/.test-artifacts" \
    -v "$SCRIPT_DIR/.report:/work/.report" \
    -v "$SCRIPT_DIR/dashboard_manifest.json:/work/dashboard_manifest.json" \
    "$image" \
    npx playwright test --config playwright.config.ts "$@"
}

shift

case "$CMD" in
  ingest)
    wait_for_kibana
    cd "$REPO_ROOT"
    npx ts-node "$SCRIPT_DIR/lib/ingest.ts"
    ;;
  screenshot)
    wait_for_kibana
    run_playwright "$@"
    ;;
  screenshot:update)
    wait_for_kibana
    run_playwright --update-snapshots "$@"
    ;;
  screenshot:reset)
    rm -rf "$SCRIPT_DIR/tests/"*-snapshots
    wait_for_kibana
    run_playwright --update-snapshots
    ;;
  local)
    command -v elastic-package >/dev/null || go install github.com/elastic/elastic-package@latest
    elastic-package stack up -v -d
    trap "elastic-package stack down" EXIT
    export KIBANA_URL=https://localhost:5601
    export ELASTICSEARCH_URL=https://localhost:9200
    export ES_USER=elastic
    export ES_PASSWORD=changeme
    wait_for_kibana
    cd "$REPO_ROOT"
    npx ts-node "$SCRIPT_DIR/lib/ingest.ts"
    run_playwright
    ;;
  generate)
    PACKAGE="${2:?Usage: $0 generate <package-name>}"
    echo "=== Generating data for '$PACKAGE' via elastic-package ==="
    if ! command -v elastic-package >/dev/null 2>&1; then
      GOBIN="${GOPATH:-$HOME/go}/bin"
      if [ -x "$GOBIN/elastic-package" ]; then
        export PATH="$GOBIN:$PATH"
      else
        echo "elastic-package not found. Install with: go install github.com/elastic/elastic-package@latest"
        exit 1
      fi
    fi

    INTEGRATIONS_DIR="$SCRIPT_DIR/.integrations-cache"
    if [ ! -d "$INTEGRATIONS_DIR/packages" ]; then
      echo "Integrations cache not found. Run './run.sh ingest' first to clone the repo."
      exit 1
    fi

    PKG_DIR="$INTEGRATIONS_DIR/packages/$PACKAGE"
    if [ ! -d "$PKG_DIR" ]; then
      echo "Package directory not found: $PKG_DIR"
      exit 1
    fi

    echo "Starting elastic-package stack..."
    elastic-package stack up -v -d

    echo "Waiting for local stack..."
    until curl -sk "https://localhost:9200" -u elastic:changeme 2>/dev/null | grep -q '"tagline"'; do
      sleep 5
    done
    echo "Local ES is ready."

    echo "Running system tests for $PACKAGE in background..."
    cd "$PKG_DIR"
    elastic-package test system --defer-cleanup 90s -v &
    TEST_PID=$!

    SEED_DIR="$SCRIPT_DIR/.seed-data/$PACKAGE"
    CAPTURED=""

    echo "Polling for data streams to capture..."
    while kill -0 "$TEST_PID" 2>/dev/null; do
      DS_LIST=$(curl -sk "https://localhost:9200/_data_stream" -u elastic:changeme 2>/dev/null \
        | python3 -c "
import sys, json
try:
    streams = json.load(sys.stdin).get('data_streams', [])
    for s in streams:
        n = s['name']
        if n.startswith('logs-${PACKAGE}.') or n.startswith('metrics-${PACKAGE}.'):
            print(n)
except: pass
" 2>/dev/null)

      for ds in $DS_LIST; do
        if ! echo "$CAPTURED" | grep -q "$ds"; then
          sleep 3
          DOCS=$(curl -sk "https://localhost:9200/${ds}/_search?size=10000" -u elastic:changeme 2>/dev/null \
            | python3 -c "
import sys, json
try:
    hits = json.load(sys.stdin).get('hits', {}).get('hits', [])
    print(json.dumps([h['_source'] for h in hits], indent=2))
except: print('[]')
" 2>/dev/null)

          COUNT=$(echo "$DOCS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo 0)
          if [ "$COUNT" -gt "0" ]; then
            mkdir -p "$SEED_DIR"
            DATASET=$(echo "$ds" | python3 -c "
import sys
n = sys.stdin.read().strip()
first_dash = n.index('-')
last_dash = n.rindex('-')
print(n[first_dash+1:last_dash])
" 2>/dev/null)
            echo "$DOCS" > "$SEED_DIR/${DATASET}.json"
            echo "  Captured $ds: $COUNT docs -> .seed-data/$PACKAGE/${DATASET}.json"
            CAPTURED="$CAPTURED $ds"
          fi
        fi
      done
      sleep 5
    done

    wait "$TEST_PID" || echo "Tests finished (some may have failed)"

    echo "Tearing down stack..."
    elastic-package stack down
    ;;
  generate:all)
    if ! command -v elastic-package >/dev/null 2>&1; then
      GOBIN="${GOPATH:-$HOME/go}/bin"
      if [ -x "$GOBIN/elastic-package" ]; then
        export PATH="$GOBIN:$PATH"
      else
        echo "elastic-package not found. Install with: go install github.com/elastic/elastic-package@latest"
        exit 1
      fi
    fi

    INTEGRATIONS_DIR="$SCRIPT_DIR/.integrations-cache"
    if [ ! -d "$INTEGRATIONS_DIR/packages" ]; then
      echo "Integrations cache not found. Run './run.sh ingest' first to clone the repo."
      exit 1
    fi

    PACKAGES=$(ls "$INTEGRATIONS_DIR/packages" 2>/dev/null | sort)
    TOTAL=$(echo "$PACKAGES" | wc -l | tr -d ' ')

    echo "=== Generating data for $TOTAL packages ==="
    echo "Starting shared elastic-package stack..."
    elastic-package stack up -v -d
    trap "echo 'Tearing down stack...'; elastic-package stack down" EXIT

    until curl -sk "https://localhost:9200" -u elastic:changeme 2>/dev/null | grep -q '"tagline"'; do
      sleep 5
    done
    echo "Local ES is ready."

    SUCCEEDED=""
    FAILED=""
    SKIPPED=""
    NO_TESTS=""
    IDX=0

    for PKG in $PACKAGES; do
      IDX=$((IDX + 1))
      PKG_DIR="$INTEGRATIONS_DIR/packages/$PKG"

      if [ -d "$SCRIPT_DIR/.seed-data/$PKG" ] && [ "$(ls -A "$SCRIPT_DIR/.seed-data/$PKG" 2>/dev/null)" ]; then
        SKIPPED="$SKIPPED $PKG"
        continue
      fi

      if [ ! -d "$PKG_DIR/data_stream" ] && [ ! -d "$PKG_DIR/_dev/test" ]; then
        NO_TESTS="$NO_TESTS $PKG"
        continue
      fi

      echo "[$IDX/$TOTAL] $PKG — running system tests..."

      cd "$PKG_DIR"
      elastic-package test system --defer-cleanup 90s -v &
      TEST_PID=$!
      set +e

      TEST_TIMEOUT="${GENERATE_TIMEOUT:-180}"
      (sleep "$TEST_TIMEOUT" && kill "$TEST_PID" 2>/dev/null && echo "  $PKG timed out after ${TEST_TIMEOUT}s") &
      TIMER_PID=$!

      SEED_DIR="$SCRIPT_DIR/.seed-data/$PKG"
      CAPTURED=""

      while kill -0 "$TEST_PID" 2>/dev/null; do
        DS_LIST=$(curl -sk "https://localhost:9200/_data_stream" -u elastic:changeme 2>/dev/null \
          | python3 -c "
import sys, json
try:
    streams = json.load(sys.stdin).get('data_streams', [])
    for s in streams:
        n = s['name']
        if n.startswith('logs-${PKG}.') or n.startswith('metrics-${PKG}.'):
            print(n)
except: pass
" 2>/dev/null)

        for ds in $DS_LIST; do
          if ! echo "$CAPTURED" | grep -q "$ds"; then
            sleep 3
            DOCS=$(curl -sk "https://localhost:9200/${ds}/_search?size=10000" -u elastic:changeme 2>/dev/null \
              | python3 -c "
import sys, json
try:
    hits = json.load(sys.stdin).get('hits', {}).get('hits', [])
    print(json.dumps([h['_source'] for h in hits], indent=2))
except: print('[]')
" 2>/dev/null)

            COUNT=$(echo "$DOCS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo 0)
            if [ "$COUNT" -gt "0" ]; then
              mkdir -p "$SEED_DIR"
              DATASET=$(echo "$ds" | python3 -c "
import sys
n = sys.stdin.read().strip()
first_dash = n.index('-')
last_dash = n.rindex('-')
print(n[first_dash+1:last_dash])
" 2>/dev/null)
              echo "$DOCS" > "$SEED_DIR/${DATASET}.json"
              echo "  Captured $ds: $COUNT docs -> .seed-data/$PKG/${DATASET}.json"
              CAPTURED="$CAPTURED $ds"
            fi
          fi
        done
        sleep 5
      done

      wait "$TEST_PID" 2>/dev/null
      kill "$TIMER_PID" 2>/dev/null
      wait "$TIMER_PID" 2>/dev/null
      docker ps -q --filter "name=elastic-package-agent-" --filter "name=elastic-package-service-" 2>/dev/null \
        | xargs -r docker rm -f >/dev/null 2>&1
      docker network prune -f >/dev/null 2>&1
      set -e

      if [ -n "$CAPTURED" ]; then
        SUCCEEDED="$SUCCEEDED $PKG"
      else
        FAILED="$FAILED $PKG"
      fi
    done

    echo ""
    echo "=== generate:all complete ==="
    echo "  Captured data:$(echo "$SUCCEEDED" | wc -w | tr -d ' ') —$SUCCEEDED"
    echo "  Skipped:      $(echo "$SKIPPED" | wc -w | tr -d ' ') —$SKIPPED"
    echo "  No data:      $(echo "$FAILED" | wc -w | tr -d ' ') —$FAILED"
    echo "  No tests:     $(echo "$NO_TESTS" | wc -w | tr -d ' ')"
    ;;
  export)
    EXPORT_PACKAGES="${2:?Usage: $0 export <package-name> [ES_URL]}"
    EXPORT_ES_URL="${3:-https://localhost:9200}"
    export EXPORT_ES_URL EXPORT_PACKAGES
    export EXPORT_ES_USER="${EXPORT_ES_USER:-elastic}"
    export EXPORT_ES_PASSWORD="${EXPORT_ES_PASSWORD:-changeme}"
    cd "$REPO_ROOT"
    npx ts-node "$SCRIPT_DIR/lib/export_data.ts"
    ;;
  cleanup)
    cd "$REPO_ROOT"
    npx ts-node "$SCRIPT_DIR/lib/cleanup.ts"
    ;;
  *)
    echo "Usage: $0 {ingest|screenshot|screenshot:update|screenshot:reset|generate|generate:all|export|cleanup|local}"
    echo ""
    echo "  ingest              Install packages + seed sample data into remote ES"
    echo "  screenshot          Compare against existing snapshots (runs in Docker)"
    echo "  screenshot:update   Overwrite existing snapshots with fresh captures"
    echo "  screenshot:reset    Wipe all snapshots and recapture from scratch"
    echo "  generate <pkg>      Run elastic-package system tests + export data as seed"
    echo "  generate:all        Generate seed data for all packages (skips existing)"
    echo "  export <pkg> [url]  Export data from a running ES to .seed-data/"
    echo "  cleanup             Delete all seeded data streams from ES"
    echo "  local               Full lifecycle with elastic-package (no remote cluster needed)"
    echo ""
    echo "Environment:"
    echo "  EXPORT_ES_URL       ES URL to export from (default: https://localhost:9200)"
    echo "  EXPORT_ES_USER      ES username (default: elastic)"
    echo "  EXPORT_ES_PASSWORD  ES password (default: changeme)"
    exit 1
    ;;
esac
