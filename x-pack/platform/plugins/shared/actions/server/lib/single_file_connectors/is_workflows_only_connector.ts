/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowsConnectorFeatureId } from '../../../common';
import type { ActionType } from '../..';

export const isWorkflowsOnlyConnectorType = ({
  supportedFeatureIds,
}: {
  supportedFeatureIds: ActionType['supportedFeatureIds'];
}): boolean =>
  supportedFeatureIds?.length === 1 && supportedFeatureIds[0] === WorkflowsConnectorFeatureId;
