/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import type { ActionPolicySampleKey } from './samples';

const SAMPLE_ID_NAMESPACE = '5e1c6f0a-7f0e-4c4e-9a5b-3b2a8f2f6d11';

const WORKFLOW_ID_PREFIX = 'alerting-v2-console-log-';

/**
 * Policies are space-isolated saved objects, so the id embeds the space to stay stable per space
 * and distinct across spaces.
 */
export const getSampleActionPolicyId = (spaceId: string, key: ActionPolicySampleKey): string =>
  uuidv5(`${spaceId}:${key}`, SAMPLE_ID_NAMESPACE);

/** Matches the human readable workflow id format (lowercase alphanumerics and hyphens). */
export const getSampleWorkflowId = (spaceId: string): string =>
  `${WORKFLOW_ID_PREFIX}${uuidv5(spaceId, SAMPLE_ID_NAMESPACE)}`;
