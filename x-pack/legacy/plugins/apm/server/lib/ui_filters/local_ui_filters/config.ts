/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import {
  CONTAINER_ID,
  POD_ID,
  SERVICE_AGENT_NAME,
  HOST_NAME,
  TRANSACTION_RESULT
} from '../../../../common/elasticsearch_fieldnames';

const filtersByName = {
  host: {
    title: i18n.translate('xpack.apm.localFilters.titles.host', {
      defaultMessage: 'Host'
    }),
    fieldName: HOST_NAME
  },
  agentName: {
    title: i18n.translate('xpack.apm.localFilters.titles.agentName', {
      defaultMessage: 'Agent name'
    }),
    fieldName: SERVICE_AGENT_NAME
  },
  containerId: {
    title: i18n.translate('xpack.apm.localFilters.titles.containerId', {
      defaultMessage: 'Container ID'
    }),
    fieldName: CONTAINER_ID
  },
  podId: {
    title: i18n.translate('xpack.apm.localFilters.titles.podId', {
      defaultMessage: 'Pod'
    }),
    fieldName: POD_ID
  },
  transactionResult: {
    title: i18n.translate('xpack.apm.localFilters.titles.transactionResult', {
      defaultMessage: 'Transaction result'
    }),
    fieldName: TRANSACTION_RESULT
  }
};

export const TERM_COUNT_LIMIT = 10;

export type LocalUIFilterName = keyof typeof filtersByName;

export interface LocalUIFilter {
  name: LocalUIFilterName;
  title: string;
  fieldName: string;
}

type LocalUIFilterMap = {
  [key in LocalUIFilterName]: LocalUIFilter;
};

export const localUIFilterNames = Object.keys(
  filtersByName
) as LocalUIFilterName[];

export const localUIFilters = localUIFilterNames.reduce(
  (acc, key) => {
    const field = filtersByName[key];

    return {
      ...acc,
      [key]: {
        ...field,
        name: key
      }
    };
  },
  {} as LocalUIFilterMap
);
