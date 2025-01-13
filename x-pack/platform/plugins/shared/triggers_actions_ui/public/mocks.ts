/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAction } from '@kbn/alerting-plugin/common';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { TypeRegistry } from '@kbn/alerts-ui-shared/src/common/type_registry';
import { uiSettingsServiceMock } from '@kbn/core/public/mocks';
import type { TriggersAndActionsUIPublicPluginStart } from './plugin';

import { getAddConnectorFlyoutLazy } from './common/get_add_connector_flyout';
import { getEditConnectorFlyoutLazy } from './common/get_edit_connector_flyout';
import { getAddRuleFlyoutLazy } from './common/get_add_rule_flyout';
import { getEditRuleFlyoutLazy } from './common/get_edit_rule_flyout';
import {
  ActionTypeModel,
  RuleTypeModel,
  RuleTagBadgeOptions,
  RuleTagBadgeProps,
  RuleEventLogListOptions,
  RuleEventLogListProps,
  RuleUiAction,
} from './types';
import { getRuleStatusDropdownLazy } from './common/get_rule_status_dropdown';
import { getRuleTagFilterLazy } from './common/get_rule_tag_filter';
import { getRuleStatusFilterLazy } from './common/get_rule_status_filter';
import { getRuleTagBadgeLazy } from './common/get_rule_tag_badge';
import { getRuleEventLogListLazy } from './common/get_rule_event_log_list';
import { getGlobalRuleEventLogListLazy } from './common/get_global_rule_event_log_list';
import { getRulesListLazy } from './common/get_rules_list';
import { getAlertsSearchBarLazy } from './common/get_alerts_search_bar';
import { getRulesListNotifyBadgeLazy } from './common/get_rules_list_notify_badge';
import { AlertsSearchBarProps } from './application/sections/alerts_search_bar';
import { CreateConnectorFlyoutProps } from './application/sections/action_connector_form/create_connector_flyout';
import { EditConnectorFlyoutProps } from './application/sections/action_connector_form/edit_connector_flyout';
import { getActionFormLazy } from './common/get_action_form';
import { ActionAccordionFormProps } from './application/sections/action_connector_form/action_form';
import { getAlertSummaryWidgetLazy } from './common/get_rule_alerts_summary';
import { getRuleDefinitionLazy } from './common/get_rule_definition';
import { getRuleStatusPanelLazy } from './common/get_rule_status_panel';
import { getRuleSnoozeModalLazy } from './common/get_rule_snooze_modal';
import { getRulesSettingsLinkLazy } from './common/get_rules_settings_link';
import { AlertSummaryWidgetDependencies } from './application/sections/alert_summary_widget/types';

function createStartMock(): TriggersAndActionsUIPublicPluginStart {
  const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
  const ruleTypeRegistry = new TypeRegistry<RuleTypeModel>();
  const connectorServices = { validateEmailAddresses: jest.fn() };
  return {
    actionTypeRegistry,
    ruleTypeRegistry,
    getActionForm: (
      props: Omit<ActionAccordionFormProps, 'actionTypeRegistry' | 'setActions'> & {
        setActions: (actions: RuleAction[]) => void;
      }
    ) => {
      const { setActions, ...restProps } = props;
      return getActionFormLazy({
        ...restProps,
        setActions: setActions as (actions: RuleUiAction[]) => void,
        actionTypeRegistry,
        connectorServices,
      });
    },
    getAddConnectorFlyout: (props: Omit<CreateConnectorFlyoutProps, 'actionTypeRegistry'>) => {
      return getAddConnectorFlyoutLazy({ ...props, actionTypeRegistry, connectorServices });
    },
    getEditConnectorFlyout: (props: Omit<EditConnectorFlyoutProps, 'actionTypeRegistry'>) => {
      return getEditConnectorFlyoutLazy({
        ...props,
        actionTypeRegistry,
        connectorServices,
      });
    },
    getAddRuleFlyout: (props) => {
      return getAddRuleFlyoutLazy({
        ...props,
        actionTypeRegistry,
        ruleTypeRegistry,
        connectorServices,
      });
    },
    getEditRuleFlyout: (props) => {
      return getEditRuleFlyoutLazy({
        ...props,
        actionTypeRegistry,
        ruleTypeRegistry,
        connectorServices,
      });
    },
    getAlertsSearchBar: (props: AlertsSearchBarProps) => {
      return getAlertsSearchBarLazy(props);
    },
    getRuleStatusDropdown: (props) => {
      return getRuleStatusDropdownLazy(props);
    },
    getRuleTagFilter: (props) => {
      return getRuleTagFilterLazy(props);
    },
    getRuleStatusFilter: (props) => {
      return getRuleStatusFilterLazy(props);
    },
    getRuleTagBadge: <T extends RuleTagBadgeOptions>(props: RuleTagBadgeProps<T>) => {
      return getRuleTagBadgeLazy<T>(props);
    },
    getRuleEventLogList: <T extends RuleEventLogListOptions>(props: RuleEventLogListProps<T>) => {
      return getRuleEventLogListLazy<T>(props);
    },
    getGlobalRuleEventLogList: (props) => {
      return getGlobalRuleEventLogListLazy(props);
    },
    getRulesListNotifyBadge: (props) => {
      return getRulesListNotifyBadgeLazy(props);
    },
    getRulesList: () => {
      return getRulesListLazy({
        connectorServices,
        rulesListProps: {},
      });
    },
    getAlertSummaryWidget: (props) => {
      const dependencies: AlertSummaryWidgetDependencies['dependencies'] = {
        charts: chartPluginMock.createStartContract(),
        uiSettings: uiSettingsServiceMock.createStartContract(),
      };
      return getAlertSummaryWidgetLazy({ ...props, dependencies });
    },
    getRuleDefinition: (props) => {
      return getRuleDefinitionLazy({ ...props, actionTypeRegistry, ruleTypeRegistry });
    },
    getRuleStatusPanel: (props) => {
      return getRuleStatusPanelLazy(props);
    },
    getRuleSnoozeModal: (props) => {
      return getRuleSnoozeModalLazy(props);
    },
    getRulesSettingsLink: () => {
      return getRulesSettingsLinkLazy();
    },
  };
}

export const triggersActionsUiMock = {
  createStart: createStartMock,
};
