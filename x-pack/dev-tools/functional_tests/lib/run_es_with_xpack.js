/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { createTestCluster } from '../../../../src/test_utils/es/es_test_cluster';
import { log } from './log';

import { setupUsers, DEFAULT_SUPERUSER_PASS } from './auth';

export async function runEsWithXpack({ ftrConfig, useSAML = false, from }) {
  const cluster = createTestCluster({
    port: ftrConfig.get('servers.elasticsearch.port'),
    password: DEFAULT_SUPERUSER_PASS,
    license: 'trial',
    from,
    log,
  });

  const kibanaPort = ftrConfig.get('servers.kibana.port');
  const idpPath = resolve(
    __dirname,
    '../../../test/saml_api_integration/fixtures/idp_metadata.xml'
  );

  const esArgs = [
    'xpack.security.enabled=true',
  ];

  const samlEsArgs = [
    ...esArgs,
    'xpack.security.authc.token.enabled=true',
    'xpack.security.authc.token.timeout=15s',
    'xpack.security.authc.realms.saml1.type=saml',
    'xpack.security.authc.realms.saml1.order=0',
    `xpack.security.authc.realms.saml1.idp.metadata.path=${idpPath}`,
    'xpack.security.authc.realms.saml1.idp.entity_id=http://www.elastic.co',
    `xpack.security.authc.realms.saml1.sp.entity_id=http://localhost:${kibanaPort}`,
    `xpack.security.authc.realms.saml1.sp.logout=http://localhost:${kibanaPort}/logout`,
    `xpack.security.authc.realms.saml1.sp.acs=http://localhost:${kibanaPort}/api/security/v1/saml`,
    'xpack.security.authc.realms.saml1.attributes.principal=urn:oid:0.0.7',
  ];

  await cluster.start(useSAML ? samlEsArgs : esArgs);
  await setupUsers(log, ftrConfig);

  return cluster;
}
