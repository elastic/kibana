/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { RuleBuilderDefinition } from '@kbn/alerting-v2-rule-form';
import type { CreateRuleOptionsFlyoutProps } from './create_rule_options_flyout';

export type { CreateRuleOptionsFlyoutLegacyItem } from './create_rule_options_flyout';

export interface AlertingV2PublicSetup {
  /**
   * Registers a builder UI for a builder type registered on the server, adding it to the rule
   * creation options and using it to render the rule's fields on edit.
   */
  registerRuleBuilder: <TState>(definition: RuleBuilderDefinition<TState>) => void;
}

export interface AlertingV2PublicStart {
  CreateRuleOptionsFlyout: ComponentType<CreateRuleOptionsFlyoutProps>;
}
