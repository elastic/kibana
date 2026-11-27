/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { commonWorkflowExecutionFailedTriggerDefinition } from '../../common/triggers/workflow_execution_failed';
import type { PublicTriggerDefinition } from '../trigger_registry/types';

export const workflowExecutionFailedPublicTriggerDefinition: PublicTriggerDefinition = {
  ...commonWorkflowExecutionFailedTriggerDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/error').then(({ icon }) => ({ default: icon }))
  ),
};
