/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { suspendedComponentWithProps } from '../lib/suspended_component_with_props';
import type { CreateConnectorFlyoutProps } from './action_connector_form/create_connector_flyout';
import type { EditConnectorFlyoutProps } from './action_connector_form/edit_connector_flyout';

export const ConnectorAddFlyout = suspendedComponentWithProps<CreateConnectorFlyoutProps>(
  lazy(() => import('./action_connector_form/create_connector_flyout/index.js'))
);
export const ConnectorEditFlyout = suspendedComponentWithProps<EditConnectorFlyoutProps>(
  lazy(() => import('./action_connector_form/edit_connector_flyout/index.js'))
);
export const ActionForm = suspendedComponentWithProps(
  lazy(() => import('./action_connector_form/action_form.js'))
);

export const RuleStatusDropdown = suspendedComponentWithProps(
  lazy(() => import('./rules_list/components/rule_status_dropdown.js'))
);
export const RuleTagFilter = suspendedComponentWithProps(
  lazy(() => import('./rules_list/components/rule_tag_filter.js'))
);
export const RuleStatusFilter = suspendedComponentWithProps(
  lazy(() => import('./rules_list/components/rule_status_filter.js'))
);
export const RuleEventLogList = suspendedComponentWithProps(
  lazy(() => import('./rule_details/components/rule_event_log_list.js'))
);
export const RulesList = suspendedComponentWithProps(
  lazy(() => import('./rules_list/components/rules_list.js'))
);
export const RulesListNotifyBadgeWithApi = suspendedComponentWithProps(
  lazy(() => import('./rules_list/components/notify_badge/index.js'))
);
export const RuleSnoozeModal = suspendedComponentWithProps(
  lazy(() => import('./rules_list/components/rule_snooze_modal.js'))
);
export const RuleDefinition = suspendedComponentWithProps(
  lazy(() => import('./rule_details/components/rule_definition.js'))
);
export const RuleTagBadge = suspendedComponentWithProps(
  lazy(() => import('./rules_list/components/rule_tag_badge.js'))
);
export const RuleStatusPanel = suspendedComponentWithProps(
  lazy(() => import('./rule_details/components/rule_status_panel.js'))
);

export const UntrackAlertsModal = suspendedComponentWithProps(
  lazy(() =>
    import('./common/components/untrack_alerts_modal.js').then((module) => ({
      default: module.UntrackAlertsModal,
    }))
  )
);

export const GlobalRuleEventLogList = suspendedComponentWithProps(
  lazy(() => import('./rule_details/components/global_rule_event_log_list.js'))
);
