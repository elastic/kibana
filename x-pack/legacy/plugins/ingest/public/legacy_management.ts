/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { management } from 'ui/management';
import { i18n } from '@kbn/i18n';

management.register('ingest', {
  display: i18n.translate('common.ui.management.dataIngestionDisplayName', {
    defaultMessage: 'Data Ingestion',
  }),
  order: 30,
  icon: 'logoAPM',
});
