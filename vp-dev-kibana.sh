#!/bin/bash
# VP dev-stack Kibana, with wedge detection.
#
# launchd KeepAlive/SuccessfulExit restarts Kibana when it EXITS. It does not
# help when Kibana WEDGES — 2026-09-01: PID alive, state R, /api/status burning
# the full timeout for ~17h. The health probe below turns a wedge into an exit
# so launchd can do its job.
WT=/Users/mac/Projects/kibana.worktrees/visibility-platform
cd "$WT" || exit 1
export XPACK_ENCRYPTEDSAVEDOBJECTS_ENCRYPTIONKEY=vpDevStack2026StableKey0123456789AB
export NODE_OPTIONS=--max-old-space-size=6144

PROBE_URL="http://127.0.0.1:5621/api/status"
BOOT_GRACE_SECS=300        # dev boot + optimizer is slow
PROBE_INTERVAL_SECS=60
PROBE_TIMEOUT_SECS=15
FAILURES_BEFORE_KILL=3     # ~3min unresponsive before we act

/Users/mac/.nvm/versions/node/v24.19.0/bin/node scripts/kibana --dev --no-base-path \
  --elasticsearch.hosts=http://127.0.0.1:9220 \
  --elasticsearch.username=kibana_system \
  --elasticsearch.password=changeme \
  --server.port=5621 \
  --server.host=127.0.0.1 \
  --mockIdpPlugin.enabled=false \
  --xpack.fleet.internal.skipUploadPackageValidation=true &
KIBANA_PID=$!

(
  sleep "$BOOT_GRACE_SECS"
  fails=0
  while kill -0 "$KIBANA_PID" 2>/dev/null; do
    if curl -sf -o /dev/null -m "$PROBE_TIMEOUT_SECS" "$PROBE_URL"; then
      fails=0
    else
      fails=$((fails + 1))
      echo "[supervisor] probe failed ${fails}/${FAILURES_BEFORE_KILL} $(date -u +%FT%TZ)"
      if [ "$fails" -ge "$FAILURES_BEFORE_KILL" ]; then
        echo "[supervisor] WEDGE DETECTED -> killing ${KIBANA_PID} for launchd restart"
        kill -9 "$KIBANA_PID" 2>/dev/null
        pkill -9 -f 'disallow-code-generation-from-strings' 2>/dev/null
        break
      fi
    fi
    sleep "$PROBE_INTERVAL_SECS"
  done
) &
PROBE_PID=$!

wait "$KIBANA_PID"
EXIT_CODE=$?
kill "$PROBE_PID" 2>/dev/null
# Non-zero exit so launchd's SuccessfulExit=false policy restarts us.
exit "${EXIT_CODE:-1}"
