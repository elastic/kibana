/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

const snapshotRegex = /-snapshot/i;

/**
 * This provides a common structure to apply to all Kibana monitoring documents so that they can be commonly
 * searched, field-collapsed, and aggregated against.
 *
 * @param {Object} kbnServer manager of Kibana services - see `src/legacy/server/kbn_server` in Kibana core
 * @param {Object} config Server config
 * @param {String} host Kibana host
 * @return {Object} The object containing a "kibana" field and source instance details.
 */
export function getKibanaInfoForStats({ kbnServerStatus, kbnServerVersion, config }) {
  const status = kbnServerStatus.toJSON();

  return {
    uuid: config.get('server.uuid'),
    name: config.get('server.name'),
    index: config.get('kibana.index'),
    host: config.get('server.host'),
    transport_address: `${config.get('server.host')}:${config.get('server.port')}`,
    version: kbnServerVersion.replace(snapshotRegex, ''),
    snapshot: snapshotRegex.test(kbnServerVersion),
    status: get(status, 'overall.state'),
  };
}
