#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a; source "$SCRIPT_DIR/.env"; set +a
fi

LENS_API_FORMAT="${1:-true}"

cd "$SCRIPT_DIR/../.."

KIBANA_BASE_PATH="${KIBANA_BASE_PATH:-vrt}"

yarn start \
  --no-dev-credentials \
  --server.basePath="/$KIBANA_BASE_PATH" \
  --server.rewriteBasePath=true \
  --elasticsearch.hosts="$ELASTICSEARCH_URL" \
  --elasticsearch.serviceAccountToken="$KIBANA_SERVICE_ACCOUNT_TOKEN" \
  --feature_flags.overrides.lens.apiFormat="$LENS_API_FORMAT"
