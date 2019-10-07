/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const LABELS = {
  key: 'labels',
  label: i18n.translate('xpack.apm.metadataTable.section.labelsLabel', {
    defaultMessage: 'Labels'
  })
};

export const HTTP = {
  key: 'http',
  label: i18n.translate('xpack.apm.metadataTable.section.httpLabel', {
    defaultMessage: 'HTTP'
  })
};

export const HOST = {
  key: 'host',
  label: i18n.translate('xpack.apm.metadataTable.section.hostLabel', {
    defaultMessage: 'Host'
  })
};

export const CONTAINER = {
  key: 'container',
  label: i18n.translate('xpack.apm.metadataTable.section.containerLabel', {
    defaultMessage: 'Container'
  })
};

export const SERVICE = {
  key: 'service',
  label: i18n.translate('xpack.apm.metadataTable.section.serviceLabel', {
    defaultMessage: 'Service'
  })
};

export const PROCESS = {
  key: 'process',
  label: i18n.translate('xpack.apm.metadataTable.section.processLabel', {
    defaultMessage: 'Process'
  })
};

export const AGENT = {
  key: 'agent',
  label: i18n.translate('xpack.apm.metadataTable.section.agentLabel', {
    defaultMessage: 'Agent'
  })
};

export const URL = {
  key: 'url',
  label: i18n.translate('xpack.apm.metadataTable.section.urlLabel', {
    defaultMessage: 'URL'
  })
};

export const USER = {
  key: 'user',
  label: i18n.translate('xpack.apm.metadataTable.section.userLabel', {
    defaultMessage: 'User'
  })
};

export const USER_AGENT = {
  key: 'user_agent',
  label: i18n.translate('xpack.apm.metadataTable.section.userAgentLabel', {
    defaultMessage: 'User agent'
  })
};

const customLabel = i18n.translate(
  'xpack.apm.metadataTable.section.customLabel',
  {
    defaultMessage: 'Custom'
  }
);

export const CUSTOM_ERROR = {
  key: 'error.custom',
  label: customLabel
};
export const CUSTOM_TRANSACTION = {
  key: 'transaction.custom',
  label: customLabel
};

export const PAGE = {
  key: 'page',
  label: i18n.translate('xpack.apm.metadataTable.section.pageLabel', {
    defaultMessage: 'Page'
  })
};
export const SPAN = {
  key: 'span',
  label: i18n.translate('xpack.apm.metadataTable.section.spanLabel', {
    defaultMessage: 'Span'
  })
};
export const TRANSACTION = {
  key: 'transaction',
  label: i18n.translate('xpack.apm.metadataTable.section.transactionLabel', {
    defaultMessage: 'Transaction'
  })
};
export const TRACE = {
  key: 'trace',
  label: i18n.translate('xpack.apm.metadataTable.section.traceLabel', {
    defaultMessage: 'Trace'
  })
};
