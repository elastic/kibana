/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { CreateRuleOptionsFlyoutProps } from './create_rule_options_flyout';
import type { EmbeddedRulesListProps } from './pages/rules_list_page/embedded_rules_list';
import type { EmbeddedRuleDetailsProps } from './pages/rules_list_page/embedded_rule_details';

export type { CreateRuleOptionsFlyoutLegacyItem } from './create_rule_options_flyout';
export type { EmbeddedRulesListProps };
export type { EmbeddedRuleDetailsProps };

export interface AlertingV2PublicStart {
  CreateRuleOptionsFlyout: ComponentType<CreateRuleOptionsFlyoutProps>;
  /** Embeddable rules list for Observability Rules hub (Alerting IA POC). */
  EmbeddedRulesList: ComponentType<EmbeddedRulesListProps>;
  /** Embeddable rule details for Observability Rules hub (Alerting IA POC). */
  EmbeddedRuleDetails: ComponentType<EmbeddedRuleDetailsProps>;
  /** Embeddable episodes (Inbox) list for Observability (Alerting IA POC). */
  EmbeddedEpisodesList: ComponentType;
}
