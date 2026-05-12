/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedPolicy } from '@kbn/index-lifecycle-management-common-shared';

export interface InspectIlmPolicyFlyoutProps {
  /** The name of the ILM policy being inspected. */
  policyName: string;
  /** The full serialized policy object (phases + _meta). */
  policy: SerializedPolicy;
  /**
   * Called when the user clicks the "Back" button.
   * Closes this flyout and returns to the previous one.
   */
  onBack: () => void;
  /**
   * Called when the user clicks "Edit policy".
   * Should navigate to the ILM policy editor for the given policy name.
   */
  onEditPolicy: (policyName: string) => void;
  /**
   * Called when the user clicks "Select policy and apply".
   * Closes the flyout and applies the selected policy.
   */
  onSelectAndApply: (policyName: string) => void;
}
