/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDescriptionFieldsFn } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { EsVersionMismatchParams } from '@kbn/response-ops-rule-params/es_version_mismatch';
import type { KibanaVersionMismatchParams } from '@kbn/response-ops-rule-params/kibana_version_mismatch';
import type { LogstashVersionMismatchParams } from '@kbn/response-ops-rule-params/logstash_version_mismatch';
import type { LicenseExpirationParams } from '@kbn/response-ops-rule-params/license_expiration';
import type { NodesChangedParams } from '@kbn/response-ops-rule-params/nodes_changed';
import type { ThreadPoolSearchRejectionsParams } from '@kbn/response-ops-rule-params/thread_pool_search_rejections';
import type { ThreadPoolWriteRejectionsParams } from '@kbn/response-ops-rule-params/thread_pool_write_rejections';

export const getDescriptionFields: GetDescriptionFieldsFn<
  | EsVersionMismatchParams
  | KibanaVersionMismatchParams
  | LogstashVersionMismatchParams
  | LicenseExpirationParams
  | NodesChangedParams
  | ThreadPoolSearchRejectionsParams
  | ThreadPoolWriteRejectionsParams
> = ({ rule, prebuildFields }) => {
  if (!rule || !prebuildFields) {
    return [];
  }

  if (rule.params.filterQueryText) {
    return [prebuildFields.customQuery(rule.params.filterQueryText)];
  }

  return [];
};
