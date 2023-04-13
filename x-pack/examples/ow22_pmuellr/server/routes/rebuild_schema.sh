#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

echo "generating schema from mapping yaml"
$SCRIPT_DIR/../../scripts/esmev.ts $SCRIPT_DIR/route_schema.yaml

echo "running prettier over generated typescript files"
node scripts/eslint --fix $SCRIPT_DIR/route_schema_*.ts
