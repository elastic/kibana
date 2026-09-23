/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GroupingMode,
  ActionPolicyDestination,
  PolicyMatcher,
  ThrottleStrategy,
} from '@kbn/alerting-v2-schemas';
import type {
  ConnectorCreationConfig,
  InlineWorkflowActionDraft,
} from '@kbn/alerting-v2-rule-form';

export type ActionPolicyFormCollapsibleSection = 'notificationControls' | 'destination';

export interface ActionPolicyFormCollapsibleSectionConfig {
  readonly initialIsOpen?: boolean;
}

export interface ActionPolicyFormConfig {
  readonly connectorCreation: ConnectorCreationConfig;
  readonly collapsibleSections?: Partial<
    Record<ActionPolicyFormCollapsibleSection, ActionPolicyFormCollapsibleSectionConfig>
  >;
}

export interface ActionPolicyFormState {
  name: string;
  description: string;
  matcher: PolicyMatcher | null;
  groupingMode: GroupingMode;
  groupBy: string[];
  throttleStrategy: ThrottleStrategy;
  throttleInterval: string;
  destinations: ActionPolicyDestination[];
  /**
   * Single-step workflow drafts pending creation. On submit each draft is
   * turned into a workflow and appended to `destinations`; they are never sent
   * to the action policy API directly.
   */
  inlineActions: InlineWorkflowActionDraft[];
}
