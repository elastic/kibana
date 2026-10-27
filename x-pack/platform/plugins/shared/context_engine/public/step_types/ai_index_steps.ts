/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { getAiIndexStepCommonDefinition } from '../../common/step_types/get_ai_index';
import { queryAiIndexStepCommonDefinition } from '../../common/step_types/query_ai_index';
import { purgeKisStepCommonDefinition } from '../../common/step_types/purge_kis';

export const getAiIndexStepDefinition = createPublicStepDefinition({
  ...getAiIndexStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/index').then(({ icon }) => ({
      default: icon,
    }))
  ),
});

export const queryAiIndexStepDefinition = createPublicStepDefinition({
  ...queryAiIndexStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/magnify').then(({ icon }) => ({
      default: icon,
    }))
  ),
});

export const purgeKisStepDefinition = createPublicStepDefinition({
  ...purgeKisStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/trash').then(({ icon }) => ({
      default: icon,
    }))
  ),
});
