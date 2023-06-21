#!/usr/bin/env bash

source src/dev/ci_setup/setup_env.sh

node scripts/build_ts_refs \
  --clean \
  --no-cache \
  --force

node scripts/type_check

echo " -- building api docs"
node --max-old-space-size=12000 scripts/build_api_docs
