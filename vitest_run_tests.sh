#!/bin/bash

## Run from REPO ROOT

# Run all api tests for "maps" plugin
npx vitest run --project maps


# Run Deployment Agnostic tests within the "platform plugins shared" workspace (project)
npx vitest run --config ./vitest.config.ts -t @svlSecurity,@svlOblt,@svlSearch,@ess --project platform-plugins-shared

# Run all tests within the "platform plugins shared" workspace (project)
npx vitest run --config ./vitest.config.ts --project platform-plugins-shared
# With html reporter
npx vitest run --reporter=html --config ./vitest.config.mts --project platform-plugins-shared

# Run one test by line number :)
npx vitest run --config ./vitest.config.ts x-pack/platform/plugins/shared/maps/api_tests/maps_telemetry.spec.ts:47
