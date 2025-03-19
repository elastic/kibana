#!/bin/bash

# # Example for splitting tests on 32 CPU to 4 shards.
# # As each process needs 1 main thread, there's 7 threads for test runners (1+7)*4 = 32
# # Use VITEST_MAX_THREADS or VITEST_MAX_FORKS depending on the pool:
# VITEST_MAX_THREADS=3 vitest run --reporter=blob --shard=1/4 &
# VITEST_MAX_THREADS=3 vitest run --reporter=blob --shard=2/4 &
# VITEST_MAX_THREADS=3 vitest run --reporter=blob --shard=3/4 &
# VITEST_MAX_THREADS=3 vitest run --reporter=blob --shard=4/4 &
# wait # https://man7.org/linux/man-pages/man2/waitpid.2.html

# vitest --merge-reports

# runs @myTest
VITEST_MAX_THREADS=3 npx vitest run --reporter=blob --shard=1/2 --config ./vitest.config.ts -t @myTest --project platform-plugins-shared &
# runs Deployment Agnostic
VITEST_MAX_THREADS=3 npx vitest run --reporter=blob --shard=2/2 --config ./vitest.config.ts -t @svlSecurity,@svlOblt,@svlSearch,@ess --project platform-plugins-shared &
wait # https://man7.org/linux/man-pages/man2/waitpid.2.html

npx vitest --merge-reports
