/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const noneValueLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.noneValue', {
  defaultMessage: 'None',
});

export const formatKiTypeLabel = (type: string): string => type.replace(/[._]/g, ' ');
