/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import type { Moment } from 'moment';
import type { EuiSuperSelectOption } from '@elastic/eui';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { DocLinksStart } from '@kbn/core/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { HttpSetup } from '@kbn/core/public';
import { KueryNode } from '@kbn/es-query';
import {
  ALERT_HISTORY_PREFIX,
  ActionType,
  AlertHistoryDefaultIndexName,
  AlertHistoryDocumentTemplate,
  AlertHistoryEsIndexConnectorId,
  AsApiContract,
} from '@kbn/actions-plugin/common';
import { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import {
  ActionGroup,
  AlertStatus,
  SanitizedRule as AlertingSanitizedRule,
  ExecutionDuration,
  RawAlertInstance,
  ResolvedSanitizedRule,
  SanitizedRuleAction as RuleAction,
  RuleLastRun,
  RuleNotifyWhenType,
  AlertSummary as RuleSummary,
  RuleSystemAction,
  RuleTaskState,
  RuleTypeMetaData,
  RuleTypeParams,
} from '@kbn/alerting-plugin/common';
import type { BulkOperationError } from '@kbn/alerting-plugin/server';
import type { RuleType, RuleTypeIndex } from '@kbn/triggers-actions-ui-types';
import {
  ValidationResult,
  UserConfiguredActionConnector,
  ActionConnector,
  ActionTypeRegistryContract,
} from '@kbn/alerts-ui-shared/src/common/types';
import { TypeRegistry } from '@kbn/alerts-ui-shared/src/common/type_registry';
import type { ComponentOpts as RuleStatusDropdownProps } from './application/sections/rules_list/components/rule_status_dropdown';
import type { RuleTagFilterProps } from './application/sections/rules_list/components/rule_tag_filter';
import type { RuleStatusFilterProps } from './application/sections/rules_list/components/rule_status_filter';
import type { RulesListProps } from './application/sections/rules_list/components/rules_list';
import type {
  RuleTagBadgeProps,
  RuleTagBadgeOptions,
} from './application/sections/rules_list/components/rule_tag_badge';
import type {
  RuleEventLogListProps,
  RuleEventLogListOptions,
} from './application/sections/rule_details/components/rule_event_log_list';
import type { GlobalRuleEventLogListProps } from './application/sections/rule_details/components/global_rule_event_log_list';
import type { AlertSummaryTimeRange } from './application/sections/alert_summary_widget/types';
import type { CreateConnectorFlyoutProps } from './application/sections/action_connector_form/create_connector_flyout';
import type { EditConnectorFlyoutProps } from './application/sections/action_connector_form/edit_connector_flyout';
import { RulesListVisibleColumns } from './application/sections/rules_list/components/rules_list_column_selector';
import type { RulesListNotifyBadgePropsWithApi } from './application/sections/rules_list/components/notify_badge';

export type {
  ActionConnectorFieldsProps,
  ActionConnectorProps,
  ActionParamsProps,
  ActionReadOnlyElementProps,
  ActionTypeModel,
  ConnectorValidationError,
  ConnectorValidationFunc,
  CustomConnectorSelectionItem,
  GenericValidationResult,
  PreConfiguredActionConnector,
  SystemAction,
} from '@kbn/alerts-ui-shared/src/common/types';

export { ActionConnectorMode } from '@kbn/alerts-ui-shared/src/common/types';

export type { ActionVariables } from '@kbn/triggers-actions-ui-types';

export {
  CONTEXT_ACTION_VARIABLES,
  OPTIONAL_ACTION_VARIABLES,
  REQUIRED_ACTION_VARIABLES,
} from '@kbn/triggers-actions-ui-types';

type RuleUiAction = RuleAction | RuleSystemAction;

// In Triggers and Actions we treat all `Alert`s as `SanitizedRule<RuleTypeParams>`
// so the `Params` is a black-box of Record<string, unknown>
type SanitizedRule<Params extends RuleTypeParams = never> = Omit<
  AlertingSanitizedRule<Params>,
  'alertTypeId' | 'actions' | 'systemActions'
> & {
  ruleTypeId: AlertingSanitizedRule['alertTypeId'];
  actions: RuleUiAction[];
};
type Rule<Params extends RuleTypeParams = RuleTypeParams> = SanitizedRule<Params>;
type ResolvedRule = Omit<
  ResolvedSanitizedRule<RuleTypeParams>,
  'alertTypeId' | 'actions' | 'systemActions'
> & {
  ruleTypeId: ResolvedSanitizedRule['alertTypeId'];
  actions: RuleUiAction[];
};

export {
  ALERT_HISTORY_PREFIX,
  AlertHistoryDefaultIndexName,
  AlertHistoryDocumentTemplate,
  AlertHistoryEsIndexConnectorId,
};
export type {
  ActionConnector,
  ActionType,
  ActionTypeRegistryContract,
  AlertStatus,
  AlertSummaryTimeRange,
  AsApiContract,
  ExecutionDuration,
  GlobalRuleEventLogListProps,
  RawAlertInstance,
  ResolvedRule,
  Rule,
  RuleAction,
  RuleEventLogListOptions,
  RuleEventLogListProps,
  RuleLastRun,
  RuleNotifyWhenType,
  RuleStatusDropdownProps,
  RuleStatusFilterProps,
  RuleSummary,
  RuleSystemAction,
  RuleTagBadgeOptions,
  RuleTagBadgeProps,
  RuleTagFilterProps,
  RuleTaskState,
  RuleType,
  RuleTypeIndex,
  RuleTypeMetaData,
  RuleTypeParams,
  RuleUiAction,
  RulesListNotifyBadgePropsWithApi,
  RulesListProps,
  CreateConnectorFlyoutProps,
  EditConnectorFlyoutProps,
  RulesListVisibleColumns,
  SanitizedRule,
  UserConfiguredActionConnector,
  ValidationResult,
};

export type ActionTypeIndex = Record<string, ActionType>;
export type RuleTypeRegistryContract = PublicMethodsOf<TypeRegistry<RuleTypeModel>>;

export enum RuleFlyoutCloseReason {
  SAVED,
  CANCELED,
}

export interface BulkEditResponse {
  rules: Rule[];
  errors: BulkOperationError[];
  total: number;
}

export interface BulkOperationResponse {
  rules: Rule[];
  errors: BulkOperationError[];
  total: number;
}

interface BulkOperationAttributesByIds {
  ids: string[];
  filter?: never;
}

interface BulkOperationAttributesByFilter {
  ids?: never;
  filter: KueryNode | null;
}

export type BulkOperationAttributesWithoutHttp =
  | BulkOperationAttributesByIds
  | BulkOperationAttributesByFilter;

export type BulkOperationAttributes = BulkOperationAttributesWithoutHttp & {
  http: HttpSetup;
};

export type BulkDisableParamsWithoutHttp = BulkOperationAttributesWithoutHttp & {
  untrack: boolean;
};

export type BulkDisableParams = BulkDisableParamsWithoutHttp & {
  http: HttpSetup;
};

export interface Pagination {
  index: number;
  size: number;
}

export interface Sorting {
  field: string;
  direction: string;
}

export type ActionConnectorWithoutId<
  Config = Record<string, unknown>,
  Secrets = Record<string, unknown>
> = Omit<UserConfiguredActionConnector<Config, Secrets>, 'id'>;

export type ActionConnectorTableItem = ActionConnector & {
  actionType: ActionType['name'];
  compatibility: string[];
};

export type RuleUpdates = Omit<Rule, 'id' | 'executionStatus' | 'lastRun' | 'nextRun'>;

export type RuleSnoozeSettings = Pick<
  Rule,
  'activeSnoozes' | 'isSnoozedUntil' | 'muteAll' | 'snoozeSchedule' | 'name'
>;

export interface RuleTableItem extends Rule {
  ruleType: RuleType['name'];
  index: number;
  actionsCount: number;
  isEditable: boolean;
  enabledInLicense: boolean;
  showIntervalWarning?: boolean;
}

export interface RuleTypeParamsExpressionProps<
  Params extends RuleTypeParams = RuleTypeParams,
  MetaData = Record<string, unknown>,
  ActionGroupIds extends string = string
> {
  id?: string;
  ruleParams: Params;
  ruleInterval: string;
  ruleThrottle: string;
  alertNotifyWhen: RuleNotifyWhenType;
  setRuleParams: <Key extends keyof Params>(property: Key, value: Params[Key] | undefined) => void;
  setRuleProperty: <Prop extends keyof Rule>(
    key: Prop,
    value: SanitizedRule<Params>[Prop] | null
  ) => void;
  onChangeMetaData: (metadata: MetaData) => void;
  errors: IErrorObject;
  defaultActionGroupId: string;
  actionGroups: Array<ActionGroup<ActionGroupIds>>;
  metadata?: MetaData;
  charts: ChartsPluginSetup;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

export interface RuleTypeModel<Params extends RuleTypeParams = RuleTypeParams> {
  id: string;
  description: string;
  iconClass: string;
  documentationUrl: string | ((docLinks: DocLinksStart) => string) | null;
  validate: (ruleParams: Params, isServerless?: boolean) => ValidationResult;
  ruleParamsExpression:
    | React.FunctionComponent<any>
    | React.LazyExoticComponent<ComponentType<RuleTypeParamsExpressionProps<Params>>>;
  requiresAppContext: boolean;
  defaultActionMessage?: string;
  defaultRecoveryMessage?: string;
  defaultSummaryMessage?: string;
  alertDetailsAppSection?:
    | React.FunctionComponent<any>
    | React.LazyExoticComponent<ComponentType<any>>;
}

export interface IErrorObject {
  [key: string]: string | string[] | IErrorObject;
}

export enum EditConnectorTabs {
  Configuration = 'configuration',
  Test = 'test',
  Rules = 'rules',
}

export interface RuleEditProps<
  Params extends RuleTypeParams = RuleTypeParams,
  MetaData extends RuleTypeMetaData = RuleTypeMetaData
> {
  initialRule: Rule<Params>;
  ruleTypeRegistry: RuleTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: (reason: RuleFlyoutCloseReason, metadata?: MetaData) => void;
  /** @deprecated use `onSave` as a callback after an alert is saved*/
  reloadRules?: () => Promise<void>;
  hideInterval?: boolean;
  onSave?: (metadata?: MetaData) => Promise<void>;
  metadata?: MetaData;
  ruleType?: RuleType<string, string>;
}

export interface RuleAddProps<
  Params extends RuleTypeParams = RuleTypeParams,
  MetaData extends RuleTypeMetaData = RuleTypeMetaData
> {
  /**
   * ID of the feature this rule should be created for.
   *
   * Notes:
   * - The feature needs to be registered using `featuresPluginSetup.registerKibanaFeature()` API during your plugin's setup phase.
   * - The user needs to have permission to access the feature in order to create the rule.
   * */
  consumer: string;
  ruleTypeRegistry: RuleTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: (reason: RuleFlyoutCloseReason, metadata?: MetaData) => void;
  ruleTypeId?: string;
  /**
   * Determines whether the user should be able to change the rule type in the UI.
   */
  canChangeTrigger?: boolean;
  initialValues?: Partial<Rule<Params>>;
  /** @deprecated use `onSave` as a callback after an alert is saved*/
  reloadRules?: () => Promise<void>;
  hideGrouping?: boolean;
  hideInterval?: boolean;
  onSave?: (metadata?: MetaData) => Promise<void>;
  metadata?: MetaData;
  ruleTypeIndex?: RuleTypeIndex;
  filteredRuleTypes?: string[];
  validConsumers?: RuleCreationValidConsumer[];
  useRuleProducer?: boolean;
  initialSelectedConsumer?: RuleCreationValidConsumer | null;
}

export interface RuleDefinitionProps<Params extends RuleTypeParams = RuleTypeParams> {
  rule: Rule<Params>;
  ruleTypeRegistry: RuleTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  onEditRule: () => Promise<void>;
  hideEditButton?: boolean;
  filteredRuleTypes?: string[];
  useNewRuleForm?: boolean;
}

export enum Percentiles {
  P50 = 'P50',
  P95 = 'P95',
  P99 = 'P99',
}

export interface TriggersActionsUiConfig {
  isUsingSecurity: boolean;
  minimumScheduleInterval?: {
    value: string;
    enforce: boolean;
  };
}

export type RuleStatus = 'enabled' | 'disabled' | 'snoozed';

export enum RRuleFrequency {
  YEARLY = 0,
  MONTHLY = 1,
  WEEKLY = 2,
  DAILY = 3,
}

export interface RecurrenceSchedule {
  freq: RRuleFrequency;
  interval: number;
  until?: Moment;
  count?: number;
  byweekday?: string[];
  bymonthday?: number[];
  bymonth?: number[];
}

export interface SnoozeSchedule {
  id: string | null;
  duration: number;
  rRule: Partial<RecurrenceSchedule> & {
    dtstart: string;
    tzid: string;
  };
}

export interface ConnectorServices {
  validateEmailAddresses: ActionsPublicPluginSetup['validateEmailAddresses'];
}

export interface RulesListFilters {
  actionTypes?: string[];
  ruleExecutionStatuses?: string[];
  ruleLastRunOutcomes?: string[];
  ruleParams?: Record<string, string | number | object>;
  ruleStatuses?: RuleStatus[];
  searchText?: string;
  tags?: string[];
  types?: string[];
  kueryNode?: KueryNode;
}

export type UpdateFiltersProps =
  | {
      filter: 'searchText';
      value: string;
    }
  | {
      filter: 'ruleStatuses';
      value: RuleStatus[];
    }
  | {
      filter: 'types' | 'actionTypes' | 'ruleExecutionStatuses' | 'ruleLastRunOutcomes' | 'tags';
      value: string[];
    }
  | {
      filter: 'ruleParams';
      value: Record<string, string | number | object>;
    }
  | {
      filter: 'kueryNode';
      value: KueryNode;
    };

export type BulkEditActions =
  | 'snooze'
  | 'unsnooze'
  | 'schedule'
  | 'unschedule'
  | 'updateApiKey'
  | 'delete';

export interface UpdateRulesToBulkEditProps {
  action: BulkEditActions;
  rules?: RuleTableItem[];
  filter?: KueryNode | null;
}

export interface LazyLoadProps {
  hideLazyLoader?: boolean;
}

export interface NotifyWhenSelectOptions {
  isSummaryOption?: boolean;
  isForEachAlertOption?: boolean;
  value: EuiSuperSelectOption<RuleNotifyWhenType>;
}

export type { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
