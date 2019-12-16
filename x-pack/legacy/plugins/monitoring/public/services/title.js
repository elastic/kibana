/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { uiModules } from 'ui/modules';
import { docTitle } from 'ui/doc_title';

const uiModule = uiModules.get('monitoring/title', []);
uiModule.service('title', () => {
  return function changeTitle(cluster, suffix) {
    let clusterName = _.get(cluster, 'cluster_name');
    clusterName = clusterName ? `- ${clusterName}` : '';
    suffix = suffix ? `- ${suffix}` : '';
    docTitle.change(
      i18n.translate('xpack.monitoring.stackMonitoringDocTitle', {
        defaultMessage: 'Stack Monitoring {clusterName} {suffix}',
        values: { clusterName, suffix },
      }),
      true
    );
  };
});
