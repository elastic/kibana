/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { createProposalStepCommonDefinition } from '../../../common/proposals/step_types/create_proposal_step';
import { updateProposalStepCommonDefinition } from '../../../common/proposals/step_types/update_proposal_step';

/**
 * The browser registry backs YAML editor validation, autocomplete and icons.
 * Registering server-side alone leaves the steps invisible to the editor.
 */
export const createProposalPublicStepDefinition = createPublicStepDefinition({
  ...createProposalStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/pencil').then(({ icon }) => ({
      default: icon,
    }))
  ),
});

export const updateProposalPublicStepDefinition = createPublicStepDefinition({
  ...updateProposalStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/check').then(({ icon }) => ({
      default: icon,
    }))
  ),
});

export const registerProposalsPublicStepDefinitions = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
) => {
  workflowsExtensions.registerStepDefinition(createProposalPublicStepDefinition);
  workflowsExtensions.registerStepDefinition(updateProposalPublicStepDefinition);
};
