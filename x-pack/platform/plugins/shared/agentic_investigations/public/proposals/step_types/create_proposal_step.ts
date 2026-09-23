/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { createProposalStepCommonDefinition } from '../../../common/proposals/step_types/create_proposal_step';

export const createProposalPublicStepDefinition = createPublicStepDefinition({
  ...createProposalStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/pencil').then(({ icon }) => ({
      default: icon,
    }))
  ),
});
