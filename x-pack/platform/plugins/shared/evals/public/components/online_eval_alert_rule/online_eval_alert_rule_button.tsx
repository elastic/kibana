/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverFooter,
  EuiSelect,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana, KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EvaluationIndices, getJudgeScoreDirection } from '@kbn/evals-common';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import type { RuleFormData, RuleFormPlugins } from '@kbn/response-ops-rule-form';
import type { EsQueryRuleParams } from '@kbn/response-ops-rule-params/es_query';
import { AlertConsumers, ES_QUERY_ID } from '@kbn/rule-data-utils';
import type { CoreStart } from '@kbn/core/public';
import { PLUGIN_ID } from '../../../common';
import {
  buildOnlineEvalAlertDrillDownPath,
  buildOnlineEvalAlertRuleParams,
  getDefaultAlertTrigger,
} from '../../../common/online_evals/alert_rule_query';
import type {
  OnlineEvalAlertTrigger,
  OnlineEvalTimeWindowUnit,
} from '../../../common/online_evals/alert_rule_query';
import { useEvaluator } from '../../hooks/use_evaluators_api';
import { useOnlineScoresPrivileges } from '../../hooks/use_online_scores_privileges';
import type { EvalsStartDependencies } from '../../types';

const RuleFormFlyout = lazy(async () => {
  const { RuleForm } = await import('@kbn/response-ops-rule-form/flyout');
  return { default: RuleForm };
});

export interface OnlineEvalAlertMetric {
  /** `score.name` the rule watches. */
  metric: string;
  /** Evaluator that produces the score; its definition tells which direction is a regression. */
  evaluatorName: string;
}

interface OnlineEvalAlertRuleButtonProps {
  workflowId: string;
  workflowName: string;
  spaceId: string | undefined;
  metrics: OnlineEvalAlertMetric[];
}

const TRIGGER_OPTIONS: Array<{ value: OnlineEvalAlertTrigger; text: string }> = [
  {
    value: 'below',
    text: i18n.translate('xpack.evals.onlineEvaluations.alertRule.trigger.below', {
      defaultMessage: 'Average drops below threshold',
    }),
  },
  {
    value: 'above',
    text: i18n.translate('xpack.evals.onlineEvaluations.alertRule.trigger.above', {
      defaultMessage: 'Average rises above threshold',
    }),
  },
];

const UNIT_OPTIONS: Array<{ value: OnlineEvalTimeWindowUnit; text: string }> = [
  {
    value: 'm',
    text: i18n.translate('xpack.evals.onlineEvaluations.alertRule.unit.minutes', {
      defaultMessage: 'minutes',
    }),
  },
  {
    value: 'h',
    text: i18n.translate('xpack.evals.onlineEvaluations.alertRule.unit.hours', {
      defaultMessage: 'hours',
    }),
  },
  {
    value: 'd',
    text: i18n.translate('xpack.evals.onlineEvaluations.alertRule.unit.days', {
      defaultMessage: 'days',
    }),
  },
];

type AlertRuleServices = CoreStart &
  Pick<EvalsStartDependencies, 'dataViews'> &
  Partial<
    Pick<
      EvalsStartDependencies,
      'triggersActionsUi' | 'data' | 'unifiedSearch' | 'charts' | 'fieldsMetadata'
    >
  >;

export const OnlineEvalAlertRuleButton: React.FC<OnlineEvalAlertRuleButtonProps> = ({
  workflowId,
  workflowName,
  spaceId,
  metrics,
}) => {
  const { services } = useKibana<AlertRuleServices>();
  const {
    http,
    notifications,
    application,
    i18n: i18nStart,
    theme,
    userProfile,
    settings,
    docLinks,
    triggersActionsUi,
    data,
    dataViews,
    unifiedSearch,
    charts,
    fieldsMetadata,
  } = services;

  // The optional plugins are narrowed here so the rule form gets a fully typed plugin bag.
  const ruleFormPlugins: RuleFormPlugins | undefined =
    triggersActionsUi && data && unifiedSearch && charts && fieldsMetadata
      ? {
          http,
          i18n: i18nStart,
          theme,
          userProfile,
          application,
          notifications,
          charts,
          settings,
          data,
          dataViews,
          unifiedSearch,
          docLinks,
          ruleTypeRegistry: triggersActionsUi.ruleTypeRegistry,
          actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
          fieldsMetadata,
        }
      : undefined;
  const hasRequiredPlugins = Boolean(
    ruleFormPlugins?.ruleTypeRegistry && ruleFormPlugins.actionTypeRegistry
  );

  const { authorizedToCreateAnyRules, ruleTypesState } = useGetRuleTypesPermissions({
    http,
    toasts: notifications.toasts,
    filteredRuleTypes: [ES_QUERY_ID],
    enabled: hasRequiredPlugins,
  });

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [metric, setMetric] = useState(metrics[0]?.metric ?? '');
  const [triggerOverride, setTriggerOverride] = useState<OnlineEvalAlertTrigger | undefined>();
  const [threshold, setThreshold] = useState('0.5');
  const [windowSize, setWindowSize] = useState('1');
  const [windowUnit, setWindowUnit] = useState<OnlineEvalTimeWindowUnit>('h');
  const [minSampleSize, setMinSampleSize] = useState('10');

  const selectedMetric = metrics.find((candidate) => candidate.metric === metric) ?? metrics[0];
  const { data: evaluatorData } = useEvaluator(
    hasRequiredPlugins ? selectedMetric?.evaluatorName : undefined
  );
  const { data: privileges, isLoading: isLoadingPrivileges } =
    useOnlineScoresPrivileges(hasRequiredPlugins);
  const canReadOnlineScores = privileges?.has_read === true;
  const direction = useMemo(() => {
    const score = evaluatorData?.evaluator.judge?.output.scores.find(
      ({ name }) => name === selectedMetric?.metric
    );
    return score ? getJudgeScoreDirection(score) : undefined;
  }, [evaluatorData, selectedMetric?.metric]);
  const trigger = triggerOverride ?? getDefaultAlertTrigger(direction);

  if (
    !ruleFormPlugins ||
    ruleTypesState.isLoading ||
    !authorizedToCreateAnyRules ||
    !spaceId ||
    metrics.length === 0
  ) {
    return null;
  }

  const thresholdValue = Number(threshold);
  const windowSizeValue = Math.floor(Number(windowSize));
  const minSampleSizeValue = Math.floor(Number(minSampleSize));
  const isFormValid =
    threshold.trim() !== '' &&
    Number.isFinite(thresholdValue) &&
    windowSizeValue >= 1 &&
    minSampleSizeValue >= 1 &&
    Boolean(selectedMetric);

  const buildInitialValues = (): RuleFormData<EsQueryRuleParams> => {
    const options = {
      monitorId: workflowId,
      spaceId,
      metric: selectedMetric.metric,
      threshold: thresholdValue,
      trigger,
      minSampleSize: minSampleSizeValue,
      windowSize: windowSizeValue,
      windowUnit,
    };
    const drillDownUrl = application.getUrlForApp(PLUGIN_ID, {
      path: buildOnlineEvalAlertDrillDownPath({ workflowId, ...options }),
      absolute: true,
    });
    return {
      name: i18n.translate('xpack.evals.onlineEvaluations.alertRule.defaultName', {
        defaultMessage:
          '{workflowName}: {metric} {trigger, select, below {below} other {above}} {threshold}',
        values: {
          workflowName,
          metric: options.metric,
          trigger: options.trigger,
          threshold: options.threshold,
        },
      }),
      tags: [],
      consumer: AlertConsumers.ALERTS,
      schedule: { interval: '5m' },
      actions: [],
      // `@kbn/response-ops-rule-params` does not export the ES|QL variant of the `.es-query` params,
      // so the builder's result is cast to the exported union type.
      params: buildOnlineEvalAlertRuleParams({
        ...options,
        drillDownUrl,
      }) as unknown as EsQueryRuleParams,
      artifacts: {
        investigation_guide: {
          blob: i18n.translate('xpack.evals.onlineEvaluations.alertRule.investigationGuide', {
            defaultMessage:
              'Open the [online evaluation]({url}) to find the traces behind the score change. The link shows the rule window counted back from when you open it, not from when the alert fired.',
            values: { url: drillDownUrl },
          }),
        },
      },
    } as RuleFormData<EsQueryRuleParams>;
  };

  const closeFlyout = () => setIsFlyoutOpen(false);

  const button = (
    <EuiButton
      size="s"
      iconType="bell"
      isDisabled={!canReadOnlineScores}
      isLoading={isLoadingPrivileges}
      onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
      data-test-subj="onlineEvalCreateAlertRuleButton"
    >
      {i18n.translate('xpack.evals.onlineEvaluations.alertRule.buttonLabel', {
        defaultMessage: 'Create alert rule',
      })}
    </EuiButton>
  );

  const buttonWithTooltip =
    canReadOnlineScores || isLoadingPrivileges ? (
      button
    ) : (
      <EuiToolTip
        content={i18n.translate('xpack.evals.onlineEvaluations.alertRule.missingPrivilegeTooltip', {
          defaultMessage:
            'You need the read index privilege on {index} to create alert rules for online evaluation scores.',
          values: { index: EvaluationIndices.ONLINE_SCORES },
        })}
        data-test-subj="onlineEvalCreateAlertRuleTooltip"
      >
        {button}
      </EuiToolTip>
    );

  return (
    <>
      <EuiPopover
        button={buttonWithTooltip}
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        anchorPosition="downRight"
        panelPaddingSize="m"
        aria-label={i18n.translate('xpack.evals.onlineEvaluations.alertRule.popoverAriaLabel', {
          defaultMessage: 'Alert rule settings',
        })}
        data-test-subj="onlineEvalAlertRulePopover"
      >
        <div css={{ width: 340 }}>
          <EuiFormRow
            label={i18n.translate('xpack.evals.onlineEvaluations.alertRule.metricLabel', {
              defaultMessage: 'Metric',
            })}
            display="rowCompressed"
          >
            <EuiSelect
              compressed
              options={metrics.map(({ metric: value }) => ({ value, text: value }))}
              value={selectedMetric?.metric}
              onChange={(event) => {
                setMetric(event.target.value);
                setTriggerOverride(undefined);
              }}
              data-test-subj="onlineEvalAlertRuleMetric"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.evals.onlineEvaluations.alertRule.triggerLabel', {
              defaultMessage: 'Alert when',
            })}
            helpText={
              direction === 'neutral'
                ? i18n.translate('xpack.evals.onlineEvaluations.alertRule.neutralHelp', {
                    defaultMessage:
                      'This score has no improvement direction, so choose which side to watch.',
                  })
                : undefined
            }
            display="rowCompressed"
          >
            <EuiSelect
              compressed
              options={TRIGGER_OPTIONS}
              value={trigger}
              onChange={(event) => setTriggerOverride(event.target.value as OnlineEvalAlertTrigger)}
              data-test-subj="onlineEvalAlertRuleTrigger"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.evals.onlineEvaluations.alertRule.thresholdLabel', {
              defaultMessage: 'Threshold',
            })}
            display="rowCompressed"
          >
            <EuiFieldNumber
              compressed
              step="any"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              data-test-subj="onlineEvalAlertRuleThreshold"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.evals.onlineEvaluations.alertRule.windowLabel', {
              defaultMessage: 'Window',
            })}
            display="rowCompressed"
          >
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem>
                <EuiFieldNumber
                  compressed
                  min={1}
                  value={windowSize}
                  onChange={(event) => setWindowSize(event.target.value)}
                  data-test-subj="onlineEvalAlertRuleWindowSize"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSelect
                  compressed
                  options={UNIT_OPTIONS}
                  value={windowUnit}
                  onChange={(event) =>
                    setWindowUnit(event.target.value as OnlineEvalTimeWindowUnit)
                  }
                  data-test-subj="onlineEvalAlertRuleWindowUnit"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.evals.onlineEvaluations.alertRule.minSampleLabel', {
              defaultMessage: 'Minimum number of scores',
            })}
            display="rowCompressed"
          >
            <EuiFieldNumber
              compressed
              min={1}
              value={minSampleSize}
              onChange={(event) => setMinSampleSize(event.target.value)}
              data-test-subj="onlineEvalAlertRuleMinSample"
            />
          </EuiFormRow>
        </div>
        <EuiPopoverFooter>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" onClick={() => setIsPopoverOpen(false)}>
                {i18n.translate('xpack.evals.onlineEvaluations.alertRule.cancel', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill
                isDisabled={!isFormValid}
                onClick={() => {
                  setIsPopoverOpen(false);
                  setIsFlyoutOpen(true);
                }}
                data-test-subj="onlineEvalAlertRuleContinue"
              >
                {i18n.translate('xpack.evals.onlineEvaluations.alertRule.continue', {
                  defaultMessage: 'Continue',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverFooter>
      </EuiPopover>
      {isFlyoutOpen ? (
        <KibanaContextProvider services={services}>
          <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
            <RuleFormFlyout
              data-test-subj="onlineEvalAlertRuleForm"
              plugins={ruleFormPlugins}
              ruleTypeId={ES_QUERY_ID}
              initialValues={buildInitialValues()}
              initialMetadata={{ isManagementPage: false }}
              onCancel={closeFlyout}
              onSubmit={closeFlyout}
              isFlyout
              multiConsumerSelection={AlertConsumers.ALERTS}
            />
          </Suspense>
        </KibanaContextProvider>
      ) : null}
    </>
  );
};
