/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { DataTierRole } from '../../../../../../../../../common/types';

export const nodeRoleToFallbackTierMap: Partial<Record<DataTierRole, string>> = {
  data_hot: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.dataTierHotLabel', {
    defaultMessage: 'hot',
  }),
  data_warm: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.dataTierWarmLabel', {
    defaultMessage: 'warm',
  }),
};
