/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { format as formatUrl } from 'url';

import {
  KIBANA_ROOT,
  KIBANA_SCRIPT_PATH,
  OPTIMIZE_BUNDLE_DIR
} from './paths';

function getKibanaBin(installDir) {
  return process.platform.startsWith('win')
    ? resolve(installDir, 'bin/kibana.bat')
    : resolve(installDir, 'bin/kibana');
}

export async function runKibanaServer(options) {
  const {
    procs,
    ftrConfig,
    devMode = false,
    enableUI = true,
    useSAML = false,
    existingInstallDir = null,
  } = options;

  if (devMode && existingInstallDir) {
    throw new Error('Kibana installations can not be run in dev mode');
  }

  const runFromSourceArgs = existingInstallDir
    ? ['--optimize.useBundleCache=true']
    : [
      KIBANA_SCRIPT_PATH,
      '--no-base-path',
      `--optimize.bundleDir=${OPTIMIZE_BUNDLE_DIR}`,
    ];

  const samlArgs = useSAML ? [
    '--server.xsrf.whitelist=[\"/api/security/v1/saml\"]',
    '--xpack.security.authProviders=[\"saml\"]',
  ] : [];

  // start the kibana server and wait for it to log "Server running" before resolving
  await procs.run('kibana', {
    cwd: existingInstallDir || KIBANA_ROOT,

    cmd: existingInstallDir
      ? getKibanaBin(existingInstallDir)
      : process.execPath,

    args: [
      ...runFromSourceArgs,
      devMode ? '--dev' : '--env=development',
      '--logging.json=false',
      `--server.port=${ftrConfig.get('servers.kibana.port')}`,
      `--server.uuid=${ftrConfig.get('env').kibana.server.uuid}`,
      `--elasticsearch.url=${formatUrl(ftrConfig.get('servers.elasticsearch'))}`,
      `--optimize.enabled=${enableUI}`,
      `--optimize.watchPort=${ftrConfig.get('servers.kibana.port') + 1}`,
      '--optimize.watchPrebuild=true',
      '--status.allowAnonymous=true',
      `--elasticsearch.username=${ftrConfig.get('servers.elasticsearch.username')}`,
      `--elasticsearch.password=${ftrConfig.get('servers.elasticsearch.password')}`,
      '--xpack.security.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf"', // server restarts should not invalidate active sessions
      '--xpack.monitoring.kibana.collection.enabled=false',
      '--xpack.xpack_main.telemetry.enabled=false',
      ...samlArgs,
    ],

    env: {
      FORCE_COLOR: 1,
      ...process.env,
    },

    wait: /Server running/,
  });
}
