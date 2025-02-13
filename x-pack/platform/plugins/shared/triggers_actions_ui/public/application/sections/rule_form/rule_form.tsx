/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  Fragment,
  useState,
  useEffect,
  useCallback,
  Suspense,
  useMemo,
  useRef,
} from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
  EuiTitle,
  EuiForm,
  EuiSpacer,
  EuiFieldText,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFormRow,
  EuiComboBox,
  EuiFieldNumber,
  EuiSelect,
  EuiIconTip,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiEmptyPrompt,
  EuiListGroupItem,
  EuiListGroup,
  EuiLink,
  EuiText,
  EuiNotificationBadge,
  EuiErrorBoundary,
  EuiToolTip,
  EuiCallOut,
  EuiAccordion,
  useEuiTheme,
  COLOR_MODES_STANDARD,
} from '@elastic/eui';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { capitalize } from 'lodash';
import { KibanaFeature } from '@kbn/features-plugin/public';
import {
  formatDuration,
  getDurationNumberInItsUnit,
  getDurationUnitValue,
  parseDuration,
} from '@kbn/alerting-plugin/common/parse_duration';
import {
  RuleActionParam,
  ALERTING_FEATURE_ID,
  RecoveredActionGroup,
  isActionGroupDisabledForActionTypeId,
  RuleActionAlertsFilterProperty,
  RuleActionKey,
} from '@kbn/alerting-plugin/common';
import { AlertingConnectorFeatureId } from '@kbn/actions-plugin/common';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { IS_RULE_SPECIFIC_FLAPPING_ENABLED } from '@kbn/alerts-ui-shared/src/common/constants/rule_flapping';
import type { Flapping } from '@kbn/alerting-types';
import { RuleReducerAction, InitialRule } from './rule_reducer';
import {
  RuleTypeModel,
  Rule,
  IErrorObject,
  RuleType,
  RuleTypeRegistryContract,
  ActionTypeRegistryContract,
  TriggersActionsUiConfig,
  RuleCreationValidConsumer,
  RuleUiAction,
} from '../../../types';
import { getTimeOptions } from '../../../common/lib/get_time_options';
import { ActionForm } from '../action_connector_form';
import { hasAllPrivilege, hasShowActionsCapability } from '../../lib/capabilities';
import { SolutionFilter } from './solution_filter';
import './rule_form.scss';
import { useKibana } from '../../../common/lib/kibana';
import { recoveredActionGroupMessage, summaryMessage } from '../../constants';
import { IsEnabledResult, IsDisabledResult } from '../../lib/check_rule_type_enabled';
import { checkRuleTypeEnabled } from '../../lib/check_rule_type_enabled';
import {
  ruleTypeCompare,
  ruleTypeGroupCompare,
  ruleTypeUngroupedCompare,
} from '../../lib/rule_type_compare';
import { VIEW_LICENSE_OPTIONS_LINK } from '../../../common/constants';
import { MULTI_CONSUMER_RULE_TYPE_IDS } from '../../constants';
import { SectionLoading } from '../../components/section_loading';
import { RuleFormConsumerSelection, VALID_CONSUMERS } from './rule_form_consumer_selection';
import { getInitialInterval } from './get_initial_interval';
import { useLoadRuleTypesQuery } from '../../hooks/use_load_rule_types_query';
import { RuleFormAdvancedOptions } from './rule_form_advanced_options';

const ENTER_KEY = 13;

const INTEGER_REGEX = /^[1-9][0-9]*$/;

const NOOP = () => {};

function getProducerFeatureName(producer: string, kibanaFeatures: KibanaFeature[]) {
  return kibanaFeatures.find((featureItem) => featureItem.id === producer)?.name;
}

const authorizedToDisplayRuleType = ({
  rule,
  ruleType,
  validConsumers,
}: {
  rule: InitialRule;
  ruleType: RuleType;
  validConsumers?: RuleCreationValidConsumer[];
}) => {
  if (!ruleType) {
    return false;
  }
  // If we have a generic threshold/ES query rule...
  if (MULTI_CONSUMER_RULE_TYPE_IDS.includes(ruleType.id)) {
    // And an array of valid consumers are passed in, we will show it
    // if the rule type has at least one of the consumers as authorized
    if (Array.isArray(validConsumers)) {
      return validConsumers.some((consumer) => hasAllPrivilege(consumer, ruleType));
    }
    // If no array was passed in, then we will show it if at least one of its
    // authorized consumers allows it to be shown.
    return Object.entries(ruleType.authorizedConsumers).some(([_, privilege]) => {
      return privilege.all;
    });
  }
  // For non-generic threshold/ES query rules, we will still do the check
  // against `alerts` since we are still setting rule consumers to `alerts`
  return hasAllPrivilege(rule.consumer, ruleType);
};

export type RuleTypeItems = Array<{ ruleTypeModel: RuleTypeModel; ruleType: RuleType }>;

interface RuleFormProps<MetaData = Record<string, any>> {
  rule: InitialRule;
  config: TriggersActionsUiConfig;
  dispatch: React.Dispatch<RuleReducerAction>;
  errors: IErrorObject;
  ruleTypeRegistry: RuleTypeRegistryContract;
  actionTypeRegistry: ActionTypeRegistryContract;
  operation: string;
  canChangeTrigger?: boolean; // to hide Change trigger button
  canShowConsumerSelection?: boolean;
  setHasActionsDisabled?: (value: boolean) => void;
  setHasActionsWithBrokenConnector?: (value: boolean) => void;
  setConsumer?: (consumer: RuleCreationValidConsumer | null) => void;
  metadata?: MetaData;
  filteredRuleTypes?: string[];
  hideGrouping?: boolean;
  hideInterval?: boolean;
  connectorFeatureId?: string;
  selectedConsumer?: RuleCreationValidConsumer | null;
  validConsumers?: RuleCreationValidConsumer[];
  onChangeMetaData: (metadata: MetaData) => void;
  useRuleProducer?: boolean;
  initialSelectedConsumer?: RuleCreationValidConsumer | null;
}

const EMPTY_ARRAY: string[] = [];

export const RuleForm = ({
  rule,
  config,
  canChangeTrigger = true,
  canShowConsumerSelection = false,
  dispatch,
  errors,
  setHasActionsDisabled,
  setHasActionsWithBrokenConnector,
  setConsumer = NOOP,
  selectedConsumer,
  operation,
  ruleTypeRegistry,
  actionTypeRegistry,
  metadata,
  filteredRuleTypes: ruleTypeToFilter = EMPTY_ARRAY,
  hideGrouping = false,
  hideInterval,
  connectorFeatureId = AlertingConnectorFeatureId,
  validConsumers,
  onChangeMetaData,
  useRuleProducer,
  initialSelectedConsumer,
}: RuleFormProps) => {
  const {
    notifications: { toasts },
    docLinks,
    application: { capabilities },
    kibanaFeatures,
    charts,
    data,
    unifiedSearch,
    dataViews,
  } = useKibana().services;
  const canShowActions = hasShowActionsCapability(capabilities);
  const { colorMode } = useEuiTheme();

  const [ruleTypeModel, setRuleTypeModel] = useState<RuleTypeModel | null>(null);
  const flyoutBodyOverflowRef = useRef<HTMLDivElement | HTMLSpanElement | null>(null);

  const defaultRuleInterval = getInitialInterval(config.minimumScheduleInterval?.value);
  const defaultScheduleInterval = getDurationNumberInItsUnit(defaultRuleInterval);
  const defaultScheduleIntervalUnit = getDurationUnitValue(defaultRuleInterval);

  const [ruleInterval, setRuleInterval] = useState<number | undefined>(
    rule.schedule.interval
      ? getDurationNumberInItsUnit(rule.schedule.interval)
      : defaultScheduleInterval
  );
  const [ruleIntervalUnit, setRuleIntervalUnit] = useState<string>(
    rule.schedule.interval
      ? getDurationUnitValue(rule.schedule.interval)
      : defaultScheduleIntervalUnit
  );
  const [alertDelay, setAlertDelay] = useState<number | undefined>(rule.alertDelay?.active ?? 1);
  const [defaultActionGroupId, setDefaultActionGroupId] = useState<string | undefined>(undefined);

  const [availableRuleTypes, setAvailableRuleTypes] = useState<RuleTypeItems>([]);
  const [filteredRuleTypes, setFilteredRuleTypes] = useState<RuleTypeItems>([]);
  const [searchText, setSearchText] = useState<string | undefined>();
  const [inputText, setInputText] = useState<string | undefined>();
  const [solutions, setSolutions] = useState<Map<string, string> | undefined>(undefined);
  const [solutionsFilter, setSolutionFilter] = useState<string[]>([]);
  let hasDisabledByLicenseRuleTypes: boolean = false;
  const {
    ruleTypesState: {
      data: ruleTypeIndex,
      error: loadRuleTypesError,
      isLoading: ruleTypesIsLoading,
    },
  } = useLoadRuleTypesQuery({ filteredRuleTypes: ruleTypeToFilter });
  const ruleTypes = useMemo(() => [...ruleTypeIndex.values()], [ruleTypeIndex]);

  // load rule types
  useEffect(() => {
    if (rule.ruleTypeId && ruleTypeIndex?.has(rule.ruleTypeId)) {
      setDefaultActionGroupId(ruleTypeIndex.get(rule.ruleTypeId)!.defaultActionGroupId);
    }

    const getAvailableRuleTypes = (ruleTypesResult: RuleType[]) =>
      ruleTypeRegistry
        .list()
        .reduce((arr: RuleTypeItems, ruleTypeRegistryItem: RuleTypeModel) => {
          const ruleType = ruleTypesResult.find((item) => ruleTypeRegistryItem.id === item.id);
          if (ruleType) {
            arr.push({
              ruleType,
              ruleTypeModel: ruleTypeRegistryItem,
            });
          }
          return arr;
        }, [])
        .filter(({ ruleType }) =>
          authorizedToDisplayRuleType({
            rule,
            ruleType,
            validConsumers,
          })
        )
        .filter((item) =>
          rule.consumer === ALERTING_FEATURE_ID
            ? !item.ruleTypeModel.requiresAppContext
            : item.ruleType!.producer === rule.consumer
        );

    const availableRuleTypesResult = getAvailableRuleTypes(ruleTypes);
    setAvailableRuleTypes(availableRuleTypesResult);

    const solutionsResult = availableRuleTypesResult.reduce(
      (result: Map<string, string>, ruleTypeItem) => {
        if (!result.has(ruleTypeItem.ruleType.producer)) {
          result.set(
            ruleTypeItem.ruleType.producer,
            (kibanaFeatures
              ? getProducerFeatureName(ruleTypeItem.ruleType.producer, kibanaFeatures)
              : capitalize(ruleTypeItem.ruleType.producer)) ??
              capitalize(ruleTypeItem.ruleType.producer)
          );
        }
        return result;
      },
      new Map()
    );
    const solutionsEntries = [...solutionsResult.entries()];
    const isOnlyO11y =
      availableRuleTypesResult.length === 1 &&
      availableRuleTypesResult.every((rt) => rt.ruleType.producer === AlertConsumers.OBSERVABILITY);
    if (!isOnlyO11y) {
      setSolutions(new Map(solutionsEntries.sort(([, a], [, b]) => a.localeCompare(b))));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ruleTypes,
    ruleTypeIndex,
    rule.ruleTypeId,
    kibanaFeatures,
    rule.consumer,
    ruleTypeRegistry,
    validConsumers,
  ]);

  useEffect(() => {
    if (loadRuleTypesError) {
      toasts.addDanger({
        title: i18n.translate(
          'xpack.triggersActionsUI.sections.ruleForm.unableToLoadRuleTypesMessage',
          { defaultMessage: 'Unable to load rule types' }
        ),
      });
    }
  }, [loadRuleTypesError, toasts]);

  useEffect(() => {
    setRuleTypeModel(rule.ruleTypeId ? ruleTypeRegistry.get(rule.ruleTypeId) : null);
    if (rule.ruleTypeId && ruleTypeIndex && ruleTypeIndex.has(rule.ruleTypeId)) {
      setDefaultActionGroupId(ruleTypeIndex.get(rule.ruleTypeId)!.defaultActionGroupId);
    }
  }, [rule, rule.ruleTypeId, ruleTypeIndex, ruleTypeRegistry]);

  useEffect(() => {
    if (rule.schedule.interval) {
      const interval = getDurationNumberInItsUnit(rule.schedule.interval);
      const intervalUnit = getDurationUnitValue(rule.schedule.interval);
      setRuleInterval(interval);
      setRuleIntervalUnit(intervalUnit);
    }
  }, [rule.schedule.interval, defaultScheduleInterval, defaultScheduleIntervalUnit]);

  useEffect(() => {
    if (rule.alertDelay) {
      setAlertDelay(rule.alertDelay.active);
    }
  }, [rule.alertDelay]);

  useEffect(() => {
    if (!flyoutBodyOverflowRef.current) {
      // We're using this as a reliable way to reset the scroll position
      // of the flyout independently of the selected rule type
      flyoutBodyOverflowRef.current = document.querySelector('.euiFlyoutBody__overflow');
    }
  }, []);

  const resetContentScroll = useCallback(() => flyoutBodyOverflowRef?.current?.scroll?.(0, 0), []);

  useEffect(() => {
    if (rule.ruleTypeId) {
      resetContentScroll();
    }
  }, [rule.ruleTypeId, resetContentScroll]);

  const setRuleProperty = useCallback(
    <Key extends keyof Rule>(key: Key, value: Rule[Key] | null) => {
      dispatch({ command: { type: 'setProperty' }, payload: { key, value } });
    },
    [dispatch]
  );

  const setActions = useCallback(
    (updatedActions: RuleUiAction[]) => setRuleProperty('actions', updatedActions),
    [setRuleProperty]
  );

  const setRuleParams = (key: string, value: any) => {
    dispatch({ command: { type: 'setRuleParams' }, payload: { key, value } });
  };

  const setScheduleProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setScheduleProperty' }, payload: { key, value } });
  };

  const setActionProperty = <Key extends RuleActionKey>(
    key: Key,
    value: RuleActionParam | null,
    index: number
  ) => {
    dispatch({ command: { type: 'setRuleActionProperty' }, payload: { key, value, index } });
  };

  const setActionParamsProperty = useCallback(
    (key: string, value: RuleActionParam, index: number) => {
      dispatch({ command: { type: 'setRuleActionParams' }, payload: { key, value, index } });
    },
    [dispatch]
  );

  const setActionFrequencyProperty = useCallback(
    (key: string, value: RuleActionParam, index: number) => {
      dispatch({ command: { type: 'setRuleActionFrequency' }, payload: { key, value, index } });
    },
    [dispatch]
  );

  const setActionAlertsFilterProperty = useCallback(
    (key: string, value: RuleActionAlertsFilterProperty, index: number) => {
      dispatch({ command: { type: 'setRuleActionAlertsFilter' }, payload: { key, value, index } });
    },
    [dispatch]
  );

  const setAlertDelayProperty = (key: string, value: any) => {
    dispatch({ command: { type: 'setAlertDelayProperty' }, payload: { key, value } });
  };

  const onAlertDelayChange = (value: string) => {
    const parsedValue = value === '' ? '' : parseInt(value, 10);
    setAlertDelayProperty('active', parsedValue || 1);
    setAlertDelay(parsedValue || undefined);
  };

  useEffect(() => {
    const searchValue = searchText ? searchText.trim().toLocaleLowerCase() : null;
    setFilteredRuleTypes(
      availableRuleTypes
        .filter((ruleTypeItem) =>
          solutionsFilter.length > 0
            ? solutionsFilter.find((item) => ruleTypeItem.ruleType!.producer === item)
            : ruleTypeItem
        )
        .filter((ruleTypeItem) =>
          searchValue
            ? ruleTypeItem.ruleType.name.toString().toLocaleLowerCase().includes(searchValue) ||
              ruleTypeItem.ruleType!.producer.toLocaleLowerCase().includes(searchValue) ||
              ruleTypeItem.ruleTypeModel.description.toLocaleLowerCase().includes(searchValue)
            : ruleTypeItem
        )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleTypeRegistry, availableRuleTypes, searchText, JSON.stringify(solutionsFilter)]);

  useEffect(() => {
    if (ruleTypeModel) {
      const ruleType = ruleTypes.find((rt) => rt.id === ruleTypeModel.id);
      if (ruleType && useRuleProducer && !MULTI_CONSUMER_RULE_TYPE_IDS.includes(ruleType.id)) {
        setConsumer(ruleType.producer as RuleCreationValidConsumer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleTypeModel, ruleTypes]);

  const authorizedConsumers = useMemo(() => {
    // If the app context provides a consumer, we assume that consumer is
    // is what we set for all rules that is created in that context
    if (rule.consumer !== ALERTING_FEATURE_ID) {
      return [];
    }

    const selectedRuleType = availableRuleTypes.find(
      ({ ruleType: availableRuleType }) => availableRuleType.id === rule.ruleTypeId
    );

    if (!selectedRuleType?.ruleType?.authorizedConsumers) {
      return [];
    }
    return Object.entries(selectedRuleType.ruleType.authorizedConsumers).reduce<
      RuleCreationValidConsumer[]
    >((result, [authorizedConsumer, privilege]) => {
      if (
        privilege.all &&
        (validConsumers || VALID_CONSUMERS).includes(
          authorizedConsumer as RuleCreationValidConsumer
        )
      ) {
        result.push(authorizedConsumer as RuleCreationValidConsumer);
      }
      return result;
    }, []);
  }, [availableRuleTypes, rule, validConsumers]);

  const shouldShowConsumerSelect = useMemo(() => {
    if (!canShowConsumerSelection) {
      return false;
    }
    if (!authorizedConsumers.length) {
      return false;
    }
    return !!rule.ruleTypeId && MULTI_CONSUMER_RULE_TYPE_IDS.includes(rule.ruleTypeId);
  }, [authorizedConsumers, rule, canShowConsumerSelection]);

  const selectedRuleType = rule?.ruleTypeId ? ruleTypeIndex?.get(rule?.ruleTypeId) : undefined;
  const recoveryActionGroup = selectedRuleType?.recoveryActionGroup?.id;

  const tagsOptions = rule.tags ? rule.tags.map((label: string) => ({ label })) : [];

  const isActionGroupDisabledForActionType = useCallback(
    (ruleType: RuleType, actionGroupId: string, actionTypeId: string): boolean => {
      return isActionGroupDisabledForActionTypeId(
        actionGroupId === ruleType?.recoveryActionGroup?.id
          ? RecoveredActionGroup.id
          : actionGroupId,
        actionTypeId
      );
    },
    []
  );

  const RuleParamsExpressionComponent = ruleTypeModel ? ruleTypeModel.ruleParamsExpression : null;

  const ruleTypesByProducer = filteredRuleTypes.reduce(
    (
      result: Record<
        string,
        Array<{
          id: string;
          name: string;
          checkEnabledResult: IsEnabledResult | IsDisabledResult;
          ruleTypeItem: RuleTypeModel;
        }>
      >,
      ruleTypeValue
    ) => {
      const producer = ruleTypeValue.ruleType.producer;
      if (producer) {
        const checkEnabledResult = checkRuleTypeEnabled(ruleTypeValue.ruleType);
        if (!checkEnabledResult.isEnabled) {
          hasDisabledByLicenseRuleTypes = true;
        }
        (result[producer] = result[producer] || []).push({
          name: ruleTypeValue.ruleType.name,
          id: ruleTypeValue.ruleTypeModel.id,
          checkEnabledResult,
          ruleTypeItem: ruleTypeValue.ruleTypeModel,
        });
      }
      return result;
    },
    {}
  );

  const sortedRuleTypeNodes = hideGrouping
    ? Object.entries(ruleTypesByProducer).sort((a, b) =>
        ruleTypeUngroupedCompare(a, b, ruleTypeToFilter)
      )
    : Object.entries(ruleTypesByProducer).sort((a, b) => ruleTypeGroupCompare(a, b, solutions));

  const ruleTypeNodes = sortedRuleTypeNodes.map(([solution, items], groupIndex) => (
    <Fragment key={`group${groupIndex}`}>
      {!hideGrouping && (
        <>
          <EuiFlexGroup
            gutterSize="none"
            alignItems="center"
            className="triggersActionsUI__ruleTypeNodeHeading"
          >
            <EuiFlexItem>
              <EuiTitle
                data-test-subj={`ruleType${groupIndex}Group`}
                size="xxxs"
                textTransform="uppercase"
              >
                <EuiTextColor color="subdued">
                  {(kibanaFeatures
                    ? getProducerFeatureName(solution, kibanaFeatures)
                    : capitalize(solution)) ?? capitalize(solution)}
                </EuiTextColor>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiNotificationBadge color="subdued">{items.length}</EuiNotificationBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiHorizontalRule size="full" margin="xs" />
        </>
      )}
      <EuiListGroup flush={true} gutterSize="m" size="m" maxWidth={false}>
        {items
          .sort((a, b) => ruleTypeCompare(a, b))
          .map((item, index) => {
            const ruleTypeListItemHtml = (
              <span>
                <strong>{item.name}</strong>
                <EuiText color="subdued" size="s">
                  <p>{item.ruleTypeItem.description}</p>
                </EuiText>
              </span>
            );
            return (
              <EuiListGroupItem
                wrapText
                key={index}
                data-test-subj={`${item.id}-SelectOption`}
                color="primary"
                label={
                  item.checkEnabledResult.isEnabled ? (
                    ruleTypeListItemHtml
                  ) : (
                    <EuiToolTip
                      position="top"
                      data-test-subj={`${item.id}-disabledTooltip`}
                      content={item.checkEnabledResult.message}
                    >
                      {ruleTypeListItemHtml}
                    </EuiToolTip>
                  )
                }
                isDisabled={!item.checkEnabledResult.isEnabled}
                onClick={() => {
                  setRuleProperty('ruleTypeId', item.id);
                  setRuleTypeModel(item.ruleTypeItem);
                  setActions([]);
                  setRuleProperty('params', {});
                  if (ruleTypeIndex && ruleTypeIndex.has(item.id)) {
                    setDefaultActionGroupId(ruleTypeIndex.get(item.id)!.defaultActionGroupId);
                  }

                  if (useRuleProducer && !MULTI_CONSUMER_RULE_TYPE_IDS.includes(item.id)) {
                    setConsumer(solution as RuleCreationValidConsumer);
                  }
                }}
              />
            );
          })}
      </EuiListGroup>
      <EuiSpacer size="m" />
    </Fragment>
  ));

  const getHelpTextForInterval = () => {
    if (!config || !config.minimumScheduleInterval) {
      return '';
    }

    // No help text if there is an error
    if (errors['schedule.interval'].length) {
      return '';
    }

    if (config.minimumScheduleInterval.enforce) {
      // Always show help text if minimum is enforced
      return i18n.translate('xpack.triggersActionsUI.sections.ruleForm.checkEveryHelpText', {
        defaultMessage: 'Interval must be at least {minimum}.',
        values: {
          minimum: formatDuration(config.minimumScheduleInterval.value, true),
        },
      });
    } else if (
      rule.schedule.interval &&
      parseDuration(rule.schedule.interval) < parseDuration(config.minimumScheduleInterval.value)
    ) {
      // Only show help text if current interval is less than suggested
      return i18n.translate(
        'xpack.triggersActionsUI.sections.ruleForm.checkEveryHelpSuggestionText',
        {
          defaultMessage:
            'Intervals less than {minimum} are not recommended due to performance considerations.',
          values: {
            minimum: formatDuration(config.minimumScheduleInterval.value, true),
          },
        }
      );
    } else {
      return '';
    }
  };

  const hasFieldsForAAD = useMemo(() => {
    const hasAlertHasData = selectedRuleType
      ? selectedRuleType.hasFieldsForAAD ||
        selectedRuleType.producer === AlertConsumers.SIEM ||
        selectedRuleType.hasAlertsMappings
      : false;

    return hasAlertHasData;
  }, [selectedRuleType]);

  const ruleTypeDetails = (
    <>
      <EuiHorizontalRule />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="s" data-test-subj="selectedRuleTypeTitle">
            <h5 id="selectedRuleTypeTitle">
              {rule.ruleTypeId && ruleTypeIndex && ruleTypeIndex.has(rule.ruleTypeId)
                ? ruleTypeIndex.get(rule.ruleTypeId)!.name
                : ''}
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        {canChangeTrigger ? (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              color="danger"
              aria-label={i18n.translate(
                'xpack.triggersActionsUI.sections.ruleForm.changeRuleTypeAriaLabel',
                {
                  defaultMessage: 'Delete',
                }
              )}
              onClick={() => {
                setRuleProperty('ruleTypeId', null);
                setRuleTypeModel(null);
                setRuleProperty('params', {});
              }}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {ruleTypeModel?.description && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiText color="subdued" size="s" data-test-subj="ruleDescription">
              {ruleTypeModel.description}&nbsp;
              {ruleTypeModel?.documentationUrl && (
                <EuiLink
                  external
                  target="_blank"
                  data-test-subj="ruleDocumentationLink"
                  href={
                    typeof ruleTypeModel.documentationUrl === 'function'
                      ? ruleTypeModel.documentationUrl(docLinks)
                      : ruleTypeModel.documentationUrl
                  }
                >
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.ruleForm.documentationLabel"
                    defaultMessage="Learn more"
                  />
                </EuiLink>
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiHorizontalRule />
      {RuleParamsExpressionComponent &&
      defaultActionGroupId &&
      rule.ruleTypeId &&
      selectedRuleType ? (
        <EuiErrorBoundary>
          <Suspense
            fallback={
              <SectionLoading>
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.ruleForm.loadingRuleTypeParamsDescription"
                  defaultMessage="Loading rule type params…"
                />
              </SectionLoading>
            }
          >
            <EuiThemeProvider darkMode={colorMode === COLOR_MODES_STANDARD.dark}>
              <RuleParamsExpressionComponent
                id={rule.id}
                ruleParams={rule.params}
                ruleInterval={`${ruleInterval ?? 1}${ruleIntervalUnit}`}
                ruleThrottle={''}
                alertNotifyWhen={rule.notifyWhen ?? 'onActionGroupChange'}
                errors={errors}
                setRuleParams={setRuleParams}
                setRuleProperty={setRuleProperty}
                defaultActionGroupId={defaultActionGroupId}
                actionGroups={selectedRuleType.actionGroups}
                metadata={metadata}
                charts={charts}
                data={data}
                dataViews={dataViews}
                unifiedSearch={unifiedSearch}
                onChangeMetaData={onChangeMetaData}
              />
            </EuiThemeProvider>
          </Suspense>
        </EuiErrorBoundary>
      ) : null}
      {hideInterval !== true && (
        <>
          <EuiFlexItem>
            <EuiFormRow
              fullWidth
              label={
                <EuiFlexGroup gutterSize="xs">
                  <EuiFlexItem>
                    {i18n.translate('xpack.triggersActionsUI.sections.ruleForm.ruleScheduleLabel', {
                      defaultMessage: 'Rule schedule',
                    })}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiIconTip
                      content={i18n.translate(
                        'xpack.triggersActionsUI.sections.ruleForm.checkWithTooltip',
                        {
                          defaultMessage:
                            'Define how often to evaluate the condition. Checks are queued; they run as close to the defined value as capacity allows.',
                        }
                      )}
                      position="top"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
              data-test-subj="intervalFormRow"
              display="rowCompressed"
              helpText={getHelpTextForInterval()}
              isInvalid={!!errors['schedule.interval'].length}
              error={errors['schedule.interval'] as string[]}
            >
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={2}>
                  <EuiFieldNumber
                    prepend={i18n.translate(
                      'xpack.triggersActionsUI.sections.ruleForm.checkFieldLabel',
                      {
                        defaultMessage: 'Check every',
                      }
                    )}
                    fullWidth
                    min={1}
                    isInvalid={!!errors['schedule.interval'].length}
                    value={ruleInterval || ''}
                    name="interval"
                    data-test-subj="intervalInput"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || INTEGER_REGEX.test(value)) {
                        const parsedValue = value === '' ? '' : parseInt(value, 10);
                        setRuleInterval(parsedValue || undefined);
                        setScheduleProperty('interval', `${parsedValue}${ruleIntervalUnit}`);
                      }
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={3}>
                  <EuiSelect
                    fullWidth
                    value={ruleIntervalUnit}
                    options={getTimeOptions(ruleInterval ?? 1)}
                    onChange={(e) => {
                      setRuleIntervalUnit(e.target.value);
                      setScheduleProperty('interval', `${ruleInterval}${e.target.value}`);
                    }}
                    data-test-subj="intervalInputUnit"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
          </EuiFlexItem>
          <EuiSpacer size="m" />
        </>
      )}

      <EuiFlexItem>
        <EuiAccordion
          id="advancedOptionsAccordion"
          data-test-subj="advancedOptionsAccordion"
          buttonContent={
            <EuiText size="s">
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.ruleForm.advancedOptionsLabel"
                defaultMessage="Advanced options"
              />
            </EuiText>
          }
        >
          <EuiSpacer size="m" />
          <RuleFormAdvancedOptions
            alertDelay={alertDelay}
            flappingSettings={rule.flapping}
            onAlertDelayChange={onAlertDelayChange}
            onFlappingChange={(flapping) => setRuleProperty('flapping', flapping as Flapping)}
            enabledFlapping={IS_RULE_SPECIFIC_FLAPPING_ENABLED}
          />
        </EuiAccordion>
      </EuiFlexItem>
      {shouldShowConsumerSelect && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexItem>
            <RuleFormConsumerSelection
              consumers={authorizedConsumers}
              onChange={setConsumer}
              errors={errors}
              selectedConsumer={selectedConsumer}
              initialSelectedConsumer={initialSelectedConsumer}
            />
          </EuiFlexItem>
        </>
      )}
      <EuiSpacer size="l" />
      {canShowActions &&
      defaultActionGroupId &&
      ruleTypeModel &&
      rule.ruleTypeId &&
      selectedRuleType ? (
        <>
          {!!errors.actionConnectors.length ? (
            <>
              <EuiSpacer />
              <EuiCallOut color="danger" size="s" title={errors.actionConnectors as string} />
              <EuiSpacer />
            </>
          ) : null}
          <EuiSpacer size="m" />
          <ActionForm
            actions={rule.actions}
            setHasActionsDisabled={setHasActionsDisabled}
            setHasActionsWithBrokenConnector={setHasActionsWithBrokenConnector}
            messageVariables={selectedRuleType.actionVariables}
            defaultActionGroupId={defaultActionGroupId}
            hasAlertsMappings={selectedRuleType.hasAlertsMappings}
            featureId={connectorFeatureId}
            producerId={
              MULTI_CONSUMER_RULE_TYPE_IDS.includes(rule.ruleTypeId)
                ? selectedConsumer ?? rule.consumer
                : selectedRuleType.producer
            }
            hasFieldsForAAD={hasFieldsForAAD}
            ruleTypeId={rule.ruleTypeId}
            isActionGroupDisabledForActionType={(actionGroupId: string, actionTypeId: string) =>
              isActionGroupDisabledForActionType(selectedRuleType, actionGroupId, actionTypeId)
            }
            actionGroups={selectedRuleType.actionGroups.map((actionGroup) =>
              actionGroup.id === selectedRuleType.recoveryActionGroup.id
                ? {
                    ...actionGroup,
                    omitMessageVariables: selectedRuleType.doesSetRecoveryContext
                      ? 'keepContext'
                      : 'all',
                    defaultActionMessage:
                      ruleTypeModel?.defaultRecoveryMessage || recoveredActionGroupMessage,
                  }
                : { ...actionGroup, defaultActionMessage: ruleTypeModel?.defaultActionMessage }
            )}
            recoveryActionGroup={recoveryActionGroup}
            setActionUseAlertDataForTemplate={(enabled: boolean, index: number) => {
              setActionProperty('useAlertDataForTemplate', enabled, index);
            }}
            setActionIdByIndex={(id: string, index: number) => setActionProperty('id', id, index)}
            setActionGroupIdByIndex={(group: string, index: number) =>
              setActionProperty('group', group, index)
            }
            setActions={setActions}
            setActionParamsProperty={setActionParamsProperty}
            actionTypeRegistry={actionTypeRegistry}
            setActionFrequencyProperty={setActionFrequencyProperty}
            setActionAlertsFilterProperty={setActionAlertsFilterProperty}
            defaultSummaryMessage={ruleTypeModel?.defaultSummaryMessage || summaryMessage}
            minimumThrottleInterval={[ruleInterval, ruleIntervalUnit]}
          />
        </>
      ) : null}
    </>
  );

  return (
    <EuiForm>
      <EuiFlexGrid columns={1}>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            id="ruleName"
            label={
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.ruleForm.ruleNameLabel"
                defaultMessage="Name"
              />
            }
            isInvalid={!!errors.name.length && rule.name !== undefined}
            error={errors.name as string}
          >
            <EuiFieldText
              fullWidth
              autoFocus={true}
              isInvalid={!!errors.name.length && rule.name !== undefined}
              name="name"
              data-test-subj="ruleNameInput"
              value={rule.name || ''}
              onChange={(e) => {
                setRuleProperty('name', e.target.value);
              }}
              onBlur={() => {
                if (!rule.name) {
                  setRuleProperty('name', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.triggersActionsUI.sections.ruleForm.tagsFieldLabel', {
              defaultMessage: 'Tags',
            })}
            labelAppend={
              <EuiText color="subdued" size="xs">
                <FormattedMessage
                  id="xpack.triggersActionsUI.sections.ruleForm.tagsFieldOptional"
                  defaultMessage="Optional"
                />
              </EuiText>
            }
          >
            <EuiComboBox
              noSuggestions
              fullWidth
              data-test-subj="tagsComboBox"
              selectedOptions={tagsOptions}
              onCreateOption={(searchValue: string) => {
                const newOptions = [...tagsOptions, { label: searchValue }];
                setRuleProperty(
                  'tags',
                  newOptions.map((newOption) => newOption.label)
                );
              }}
              onChange={(selectedOptions: Array<{ label: string }>) => {
                setRuleProperty(
                  'tags',
                  selectedOptions.map((selectedOption) => selectedOption.label)
                );
              }}
              onBlur={() => {
                if (!rule.tags) {
                  setRuleProperty('tags', []);
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGrid>
      <EuiSpacer size="m" />
      <div data-test-subj="ruleGroupTypeSelectContainer">
        {ruleTypeModel ? (
          <>{ruleTypeDetails}</>
        ) : availableRuleTypes.length ? (
          <>
            <EuiHorizontalRule />
            <EuiFormRow
              fullWidth
              labelAppend={
                hasDisabledByLicenseRuleTypes && (
                  <EuiTitle size="xxs">
                    <EuiLink
                      href={VIEW_LICENSE_OPTIONS_LINK}
                      target="_blank"
                      external
                      className="actActionForm__getMoreActionsLink"
                    >
                      <FormattedMessage
                        defaultMessage="Get more rule types"
                        id="xpack.triggersActionsUI.sections.actionForm.getMoreRuleTypesTitle"
                      />
                    </EuiLink>
                  </EuiTitle>
                )
              }
              label={
                <EuiTitle size="xxs">
                  <h5>
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.ruleForm.ruleTypeSelectLabel"
                      defaultMessage="Select rule type"
                    />
                  </h5>
                </EuiTitle>
              }
            >
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem>
                  <EuiFieldSearch
                    fullWidth
                    data-test-subj="ruleSearchField"
                    onChange={(e) => {
                      setInputText(e.target.value);
                      if (e.target.value === '') {
                        setSearchText('');
                      }
                    }}
                    onKeyUp={(e) => {
                      if (e.keyCode === ENTER_KEY) {
                        setSearchText(inputText);
                      }
                    }}
                    placeholder={i18n.translate(
                      'xpack.triggersActionsUI.sections.ruleForm.searchPlaceholderTitle',
                      { defaultMessage: 'Search' }
                    )}
                  />
                </EuiFlexItem>
                {solutions ? (
                  <EuiFlexItem grow={false}>
                    <SolutionFilter
                      key="solution-filter"
                      solutions={solutions}
                      onChange={(selectedSolutions: string[]) =>
                        setSolutionFilter(selectedSolutions)
                      }
                    />
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            </EuiFormRow>
            <EuiSpacer />
            {!!errors.ruleTypeId.length && rule.ruleTypeId !== undefined ? (
              <>
                <EuiSpacer />
                <EuiCallOut color="danger" size="s" title={errors.ruleTypeId as string} />
                <EuiSpacer />
              </>
            ) : null}
            {ruleTypeNodes}
          </>
        ) : ruleTypeIndex && !ruleTypesIsLoading ? (
          <NoAuthorizedRuleTypes operation={operation} />
        ) : (
          <SectionLoading>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.ruleForm.loadingRuleTypesDescription"
              defaultMessage="Loading rule types…"
            />
          </SectionLoading>
        )}
      </div>
    </EuiForm>
  );
};

const NoAuthorizedRuleTypes = ({ operation }: { operation: string }) => (
  <EuiEmptyPrompt
    iconType="lock"
    data-test-subj="noAuthorizedRuleTypesPrompt"
    titleSize="xs"
    title={
      <h2>
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.ruleForm.error.noAuthorizedRuleTypesTitle"
          defaultMessage="You have not been authorized to {operation} any rule types"
          values={{ operation }}
        />
      </h2>
    }
    body={
      <div>
        <p role="banner">
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.ruleForm.error.noAuthorizedRuleTypes"
            defaultMessage="In order to {operation} a Rule you need to have been granted the appropriate privileges."
            values={{ operation }}
          />
        </p>
      </div>
    }
  />
);
