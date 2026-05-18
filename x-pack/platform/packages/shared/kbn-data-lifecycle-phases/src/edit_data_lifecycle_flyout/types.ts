/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedPolicy } from '@kbn/index-lifecycle-management-common-shared';

export type DataLifecycleMethod = 'dlm' | 'ilm';

/**
 * Minimal phase shape needed by the flyout body for summary stats:
 * delete age, phase count, and downsample step count.
 */
export interface IlmPolicyPhaseForFlyout {
  min_age?: string;
  actions?: {
    delete?: unknown;
    downsample?: unknown;
    [key: string]: unknown;
  };
}

/**
 * Minimal ILM policy shape accepted by EditDataLifecycleFlyoutBody.
 * Only the fields needed for list display and summary stats are required.
 * Provide `serializedPolicy` to enable the full inspect flyout.
 */
export interface IlmPolicyForFlyout {
  name: string;
  phases: {
    hot?: IlmPolicyPhaseForFlyout;
    warm?: IlmPolicyPhaseForFlyout;
    cold?: IlmPolicyPhaseForFlyout;
    frozen?: IlmPolicyPhaseForFlyout;
    delete?: IlmPolicyPhaseForFlyout;
  };
  /** Full serialized policy — provide to enable the inspect flyout. */
  serializedPolicy?: SerializedPolicy;
}
