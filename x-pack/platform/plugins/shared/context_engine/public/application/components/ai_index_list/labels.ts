/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AiIndexType } from '../../../../common/http_api/ai_indices';
import type { AiIndexOwner } from '../../utils/ai_index_owner';

export const AI_INDEX_TYPE_LABEL: Record<AiIndexType, string> = {
  index: i18n.translate('xpack.contextEngine.landing.card.type.index', {
    defaultMessage: 'Index',
  }),
  data_stream: i18n.translate('xpack.contextEngine.landing.card.type.dataStream', {
    defaultMessage: 'Data stream',
  }),
};

export const AI_INDEX_OWNER_LABEL: Record<AiIndexOwner, string> = {
  managed: i18n.translate('xpack.contextEngine.landing.owner.managed', {
    defaultMessage: 'Managed',
  }),
  user: i18n.translate('xpack.contextEngine.landing.owner.user', {
    defaultMessage: 'User created',
  }),
};
