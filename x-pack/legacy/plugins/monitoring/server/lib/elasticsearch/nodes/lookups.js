/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Note: currently only `node` and `master` are supported due to
 * https://github.com/elastic/x-pack-kibana/issues/608
 */

import { i18n } from '@kbn/i18n';

export const nodeTypeClass = {
  invalid: 'fa-exclamation-triangle',
  node: 'fa-server',
  master: 'fa-star',
  master_only: 'fa-star-o',
  data: 'fa-database',
  client: 'fa-binoculars',
};

export const nodeTypeLabel = {
  invalid: i18n.translate('xpack.monitoring.es.nodeType.invalidNodeLabel', {
    defaultMessage: 'Invalid Node',
  }),
  node: i18n.translate('xpack.monitoring.es.nodeType.nodeLabel', {
    defaultMessage: 'Node',
  }),
  master: i18n.translate('xpack.monitoring.es.nodeType.masterNodeLabel', {
    defaultMessage: 'Master Node',
  }),
  master_only: i18n.translate('xpack.monitoring.es.nodeType.masterOnlyNodeLabel', {
    defaultMessage: 'Master Only Node',
  }),
  data: i18n.translate('xpack.monitoring.es.nodeType.dataOnlyNodeLabel', {
    defaultMessage: 'Data Only Node',
  }),
  client: i18n.translate('xpack.monitoring.es.nodeType.clientNodeLabel', {
    defaultMessage: 'Client Node',
  }),
};
