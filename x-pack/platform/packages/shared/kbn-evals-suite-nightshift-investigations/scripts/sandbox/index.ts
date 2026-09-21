/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join, resolve } from 'path';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { DEFAULT_SANDBOX_PORTS, readSandboxPorts } from './sandbox_env';
import { startSandbox } from './start_sandbox';

const DEFAULT_DATA_DIR = join(REPO_ROOT, 'data/nightshift_sandbox');

run(
  ({ log, addCleanupTask, flags }) => {
    const controller = new AbortController();
    addCleanupTask(() => controller.abort());

    return startSandbox({
      log,
      signal: controller.signal,
      ports: readSandboxPorts(flags),
      dataDir: flags['data-dir'] ? resolve(String(flags['data-dir'])) : DEFAULT_DATA_DIR,
      ref: flags.ref ? String(flags.ref) : 'main',
      repoDir: flags['repo-dir'] ? resolve(String(flags['repo-dir'])) : undefined,
      rebuild: Boolean(flags.rebuild),
      addCleanupTask,
    });
  },
  {
    description: `
      Build and run the external sandbox that the Nightshift golden eval needs.

      Clones the private elastic/sandbox-service repository, builds container-manager and
      sandbox-api with Go, builds the sandbox image, creates its Docker network, generates mTLS
      certificates and an API key, then runs both services natively in the foreground. Everything
      lives under data/nightshift_sandbox, which git ignores.

      Once it reports ready, load the connection variables where you run the evals:

        source data/nightshift_sandbox/sandbox.env
        node scripts/evals start --suite nightshift-investigations --profile golden

      Needs git access to elastic/sandbox-service, Go, openssl, and a running Docker whose
      container IPs are reachable from the host: native on Linux, OrbStack on macOS.
    `,
    flags: {
      string: ['ref', 'repo-dir', 'data-dir', 'grpc-port', 'probe-port', 'manager-port'],
      boolean: ['rebuild'],
      help: `
        --ref            sandbox-service git ref to build (default: main)
        --repo-dir       Build an existing sandbox-service checkout as-is instead of cloning
        --data-dir       Where the clone, binaries, certificates and sandbox.env live
                         (default: data/nightshift_sandbox)
        --rebuild        Rebuild the binaries and the sandbox image even if they exist
        --grpc-port      gRPC port Kibana connects to (default: ${DEFAULT_SANDBOX_PORTS.grpc})
        --probe-port     HTTP probe port (default: ${DEFAULT_SANDBOX_PORTS.probe})
        --manager-port   container-manager port (default: ${DEFAULT_SANDBOX_PORTS.manager})
      `,
    },
  }
);
