/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataSourceExclusions } from '../../common/types';

/**
 * These are the default exclusions for data sources (data streams and indices).
 *
 * They are used to exclude migrations from getting certain corrective actions.
 * This is needed to avoid breaking certain built-in/system functionality that might rely on writing to these data source.
 *
 * These indices can be overridden by the user in the Kibana configuration:
 *
 * For Example this will renenable all corrective actions for the siem-signals data source:
 * xpack.upgrade_assistant.dataSourceExclusions:
 *    '.siem-signals*': []
 */
export const defaultExclusions: DataSourceExclusions = {
  '.siem-signals*': ['readOnly'],
  '.alerts*': ['readOnly'],
  '.internal.alerts*': ['readOnly'],
  '.preview.alerts*': ['readOnly'],
  '.internal.preview.alerts*': ['readOnly'],
  '.adhoc.alerts*': ['readOnly'],
  '.internal.adhoc.alerts*': ['readOnly'],
  '.lists-*': ['readOnly'],
  '.items-*': ['readOnly'],
  '.logs-endpoint.actions-*': ['readOnly'],
  '.logs-endpoint.action.responses-*': ['readOnly'],
  '.metrics-endpoint.metadata_united_default': ['readOnly'],
  '.logs-osquery_manager.actions-*': ['readOnly'],
  '.logs-osquery_manager.action.responses-*': ['readOnly'],
  '.logs-endpoint.diagnostic.collection-*': ['readOnly'],
  'kibana_sample_data_*': ['readOnly'],
  '.elastic-connectors*': ['readOnly'],
  '.ml-annotations-*': ['readOnly'],
  '.ml-notifications-*': ['readOnly'],
  '.ml-state-*': ['readOnly'],
};

/**
 * Matches the data source name against the exclusion pattern and returns the actions that should be excluded.
 * If the exclusion ends with a `*` it will match any data source that starts with the excluded pattern.
 * Otherwise it will match the data source name exactly.
 */
export const matchExclusionPattern = (dataStreamName: string, exclusions: DataSourceExclusions) => {
  const result = Object.entries(exclusions).find(([excludedPattern]) => {
    const isPattern = /.+\*$/.test(excludedPattern);
    if (isPattern) {
      const matcher = excludedPattern.slice(0, -1);
      return dataStreamName.startsWith(matcher);
    }
    return dataStreamName === excludedPattern;
  });

  if (!result) {
    return [];
  }

  return result[1];
};
