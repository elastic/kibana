#!/usr/bin/env bash
# Exercises a running render service: status, capabilities, a PNG and a PDF of the packs' own examples, a
# vocabulary mismatch, and an invalid composition. Usage: smoke.sh [http://localhost:3000] [out-dir]
set -euo pipefail

BASE="${1:-http://localhost:3000}"
OUT="${2:-.}"
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"

step() { printf '\n--- %s\n' "$1"; }

step "status"
curl -fsS "$BASE/status" | tee "$OUT/status.json"; echo

step "readyz (waits for the render process to warm)"
for _ in $(seq 1 60); do
  if curl -fsS "$BASE/readyz" >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS "$BASE/readyz"; echo

VOCABULARY="$(node -e "console.log(require('$OUT/status.json').vocabulary)")"

step "capabilities"
curl -fsS "$BASE/v1/capabilities" > "$OUT/capabilities.json"
node -e "const c=require('$OUT/capabilities.json'); console.log({primitives:c.primitives.length, surfaces:c.surfaces, formats:c.formats, packs:Object.keys(c.packs)})"

step "examples -> png (components pack)"
curl -fsS "$BASE/v1/examples?packs=components" > "$OUT/examples.json"
node -e "const e=require('$OUT/examples.json'); console.log(JSON.stringify({composition:e, options:{format:'png', width:760}, expects:{vocabulary:'$VOCABULARY'}}))" \
  | curl -fsS -D "$OUT/png.headers" -H 'content-type: application/json' --data-binary @- "$BASE/v1/render-composition" -o "$OUT/examples.png"
grep -i "x-render-total-ms\|x-isomer-vocabulary" "$OUT/png.headers"; ls -la "$OUT/examples.png"

step "examples -> pdf (components + charts packs)"
curl -fsS "$BASE/v1/examples?packs=components,charts" > "$OUT/examples_charts.json"
node -e "const e=require('$OUT/examples_charts.json'); console.log(JSON.stringify({composition:e, options:{format:'pdf', width:760, metadata:{title:'Isomer render service smoke'}}}))" \
  | curl -fsS -D "$OUT/pdf.headers" -H 'content-type: application/json' --data-binary @- "$BASE/v1/render-composition" -o "$OUT/examples.pdf"
grep -i "x-render-total-ms" "$OUT/pdf.headers"; ls -la "$OUT/examples.pdf"

step "a caller on a different vocabulary is refused (409)"
curl -sS -o /dev/null -w '%{http_code}\n' -H 'content-type: application/json' \
  -d '{"composition":{"type":"view","body":[]},"expects":{"vocabulary":"0000000000000000"}}' "$BASE/v1/render-composition"

step "an unknown primitive is refused before it reaches the render slot (400)"
curl -sS -w '\n%{http_code}\n' -H 'content-type: application/json' \
  -d '{"composition":{"type":"view","body":[{"type":"notAPrimitive"}]}}' "$BASE/v1/render-composition" | tail -c 400

step "metrics"
curl -fsS "$BASE/metrics"
