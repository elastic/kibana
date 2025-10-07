/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, useEffect, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiRadioGroup,
  EuiSuperSelect,
} from '@elastic/eui';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { getFields } from '@kbn/triggers-actions-ui-plugin/public';
import { type DataPublicPluginStart, getEsQueryConfig } from '@kbn/data-plugin/public';
import { getTime } from '@kbn/data-plugin/common';
import type { IUiSettingsClient } from '@kbn/core/public';
import { ESQLLangEditor } from '@kbn/esql/public';
import { getESQLAdHocDataview, getESQLResults } from '@kbn/esql-utils';
import { type AggregateQuery, buildEsQuery } from '@kbn/es-query';
import { parseDuration } from '@kbn/alerting-plugin/common';
import {
  firstFieldOption,
  getTimeFieldOptions,
  getTimeOptions,
  isPerRowAggregation,
  parseAggregationResults,
} from '@kbn/triggers-actions-ui-plugin/public/common';
import { EsqlQuery } from '@kbn/esql-ast';
import useDebounce from 'react-use/lib/useDebounce';

import type { EsQueryRuleMetaData, EsQueryRuleParams } from '../types';
import { SearchType } from '../types';
import { DEFAULT_VALUES, SERVERLESS_DEFAULT_VALUES } from '../constants';
import { useTriggerUiActionServices } from '../util';
import { hasExpressionValidationErrors } from '../validation';
import { TestQueryRow } from '../test_query_row';
import { transformToEsqlTable, getEsqlQueryHits, ALERT_ID_SUGGESTED_MAX } from '../../../../common';

const getTimeFilter = (
  queryService: DataPublicPluginStart['query'],
  uiSettings: IUiSettingsClient,
  timeFieldName?: string
) => {
  const esQueryConfigs = getEsQueryConfig(uiSettings);
  const timeFilter =
    queryService.timefilter.timefilter.getTime() &&
    getTime(undefined, queryService.timefilter.timefilter.getTime(), {
      fieldName: timeFieldName,
    });

  return buildEsQuery(undefined, [], timeFilter ? [timeFilter] : [], esQueryConfigs);
};

const ALL_DOCUMENTS = 'all';
const alertingOptions = [
  {
    id: ALL_DOCUMENTS,
    label: i18n.translate('xpack.stackAlerts.esQuery.ui.allDocumentsLabel', {
      defaultMessage: 'Create an alert if matches are found',
    }),
  },
  {
    id: 'row',
    label: i18n.translate('xpack.stackAlerts.esQuery.ui.alertPerRowLabel', {
      defaultMessage: 'Create an alert for each row',
    }),
  },
];

const getWarning = (duplicateAlertIds?: Set<string>, longAlertIds?: Set<string>) => {
  if (duplicateAlertIds && duplicateAlertIds.size > 0) {
    return i18n.translate('xpack.stackAlerts.esQuery.ui.alertPerRowWarning', {
      defaultMessage:
        'Test returned multiple rows with the same alert ID. Consider updating the query to group on different fields.',
    });
  } else if (longAlertIds && longAlertIds.size > 0) {
    return i18n.translate('xpack.stackAlerts.esQuery.ui.alertPerRowAlertIdWarning', {
      defaultMessage:
        'The number of fields used to generate the alert ID should be limited to a maximum of {max}. ',
      values: {
        max: ALERT_ID_SUGGESTED_MAX,
      },
    });
  }
};

const keepRecommendedWarning = i18n.translate(
  'xpack.stackAlerts.esQuery.ui.keepRecommendedWarning',
  {
    defaultMessage:
      'KEEP processing command is recommended for ES|QL queries to limit the number of columns returned.',
  }
);

const observabilityRuleOptions = [
  {
    value: 'metrics.alert.threshold',
    inputDisplay: i18n.translate('xpack.stackAlerts.esQuery.ui.metricThreshold', {
      defaultMessage: 'Metric threshold',
    }),
    esqlQuery:
      'FROM metrics-* | WHERE @timestamp >= NOW() - 5 minutes | STATS avg_cpu = AVG(system.cpu.total.norm.pct) BY host.name | WHERE avg_cpu > 0.8',
    dropdownDisplay: (
      <>
        <strong>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.metricThreshold', {
            defaultMessage: 'Metric threshold',
          })}
        </strong>
        <div>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.metricThresholdDescription', {
            defaultMessage: 'Alert when metrics reach a threshold',
          })}
        </div>
        <div
          style={{
            fontSize: '0.85em',
            color: '#69707D',
            marginTop: '4px',
            fontFamily: 'monospace',
          }}
        >
          FROM metrics-* | STATS avg_cpu = AVG(system.cpu.total.norm.pct) BY host.name
        </div>
      </>
    ),
  },
  {
    value: 'metrics.alert.inventory.threshold',
    inputDisplay: i18n.translate('xpack.stackAlerts.esQuery.ui.inventoryThreshold', {
      defaultMessage: 'Inventory',
    }),
    esqlQuery:
      'FROM metrics-* | WHERE @timestamp >= NOW() - 1 minute AND host.name IS NOT NULL | STATS avg_memory = AVG(system.memory.used.pct) BY host.name | WHERE avg_memory > 0.9',
    dropdownDisplay: (
      <>
        <strong>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.inventoryThreshold', {
            defaultMessage: 'Inventory',
          })}
        </strong>
        <div>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.inventoryThresholdDescription', {
            defaultMessage: 'Alert on inventory metrics for hosts, pods, and containers',
          })}
        </div>
        <div
          style={{
            fontSize: '0.85em',
            color: '#69707D',
            marginTop: '4px',
            fontFamily: 'monospace',
          }}
        >
          FROM metrics-* | STATS AVG(system.memory.used.pct) BY host.name
        </div>
      </>
    ),
  },
  {
    value: 'logs.alert.document.count',
    inputDisplay: i18n.translate('xpack.stackAlerts.esQuery.ui.logThreshold', {
      defaultMessage: 'Log threshold',
    }),
    esqlQuery:
      'FROM logs-* | WHERE @timestamp >= NOW() - 5 minutes AND log.level == "error" | STATS error_count = COUNT(*)',
    dropdownDisplay: (
      <>
        <strong>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.logThreshold', {
            defaultMessage: 'Log threshold',
          })}
        </strong>
        <div>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.logThresholdDescription', {
            defaultMessage: 'Alert when log document count reaches a threshold',
          })}
        </div>
        <div
          style={{
            fontSize: '0.85em',
            color: '#69707D',
            marginTop: '4px',
            fontFamily: 'monospace',
          }}
        >
          FROM logs-* | WHERE log.level == &quot;error&quot; | STATS COUNT(*)
        </div>
      </>
    ),
  },
  {
    value: 'apm.error_rate',
    inputDisplay: i18n.translate('xpack.stackAlerts.esQuery.ui.errorCountThreshold', {
      defaultMessage: 'Error count threshold',
    }),
    esqlQuery:
      'FROM traces-apm* | WHERE @timestamp >= NOW() - 5 minutes AND processor.event == "error" | STATS error_count = COUNT(*) BY service.name, service.environment | WHERE error_count > 10',
    dropdownDisplay: (
      <>
        <strong>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.errorCountThreshold', {
            defaultMessage: 'Error count threshold',
          })}
        </strong>
        <div>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.errorCountThresholdDescription', {
            defaultMessage: 'Alert when APM error count exceeds threshold',
          })}
        </div>
        <div
          style={{
            fontSize: '0.85em',
            color: '#69707D',
            marginTop: '4px',
            fontFamily: 'monospace',
          }}
        >
          FROM traces-apm* | WHERE processor.event == &quot;error&quot; | STATS COUNT(*) BY
          service.name, service.environment
        </div>
      </>
    ),
  },
  {
    value: 'apm.transaction_error_rate',
    inputDisplay: i18n.translate('xpack.stackAlerts.esQuery.ui.transactionErrorRate', {
      defaultMessage: 'Failed transaction rate',
    }),
    esqlQuery:
      'FROM traces-apm* | WHERE @timestamp >= NOW() - 5 minutes AND processor.event == "transaction" | EVAL is_failure = CASE(event.outcome == "failure", 1, 0) | STATS total = COUNT(*), failures = SUM(is_failure) BY service.name, service.environment, transaction.type | EVAL error_rate = failures / total | WHERE error_rate > 0.05',
    dropdownDisplay: (
      <>
        <strong>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.transactionErrorRate', {
            defaultMessage: 'Failed transaction rate',
          })}
        </strong>
        <div>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.transactionErrorRateDescription', {
            defaultMessage: 'Alert when APM transaction error rate exceeds threshold',
          })}
        </div>
        <div
          style={{
            fontSize: '0.85em',
            color: '#69707D',
            marginTop: '4px',
            fontFamily: 'monospace',
          }}
        >
          FROM traces-apm* | EVAL is_failure = CASE(event.outcome == &quot;failure&quot;, 1, 0) |
          STATS SUM(is_failure) BY service.name, service.environment, transaction.type
        </div>
      </>
    ),
  },
  {
    value: 'apm.transaction_duration',
    inputDisplay: i18n.translate('xpack.stackAlerts.esQuery.ui.latencyThreshold', {
      defaultMessage: 'Latency threshold',
    }),
    esqlQuery:
      'FROM traces-apm* | WHERE @timestamp >= NOW() - 5 minutes AND processor.event == "transaction" | STATS avg_duration = AVG(transaction.duration.us) BY service.name, service.environment, transaction.type | WHERE avg_duration > 1000000',
    dropdownDisplay: (
      <>
        <strong>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.latencyThreshold', {
            defaultMessage: 'Latency threshold',
          })}
        </strong>
        <div>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.latencyThresholdDescription', {
            defaultMessage: 'Alert when APM transaction duration exceeds threshold',
          })}
        </div>
        <div
          style={{
            fontSize: '0.85em',
            color: '#69707D',
            marginTop: '4px',
            fontFamily: 'monospace',
          }}
        >
          FROM traces-apm* | STATS AVG(transaction.duration.us) BY service.name,
          service.environment, transaction.type
        </div>
      </>
    ),
  },
  {
    value: 'apm.anomaly',
    inputDisplay: i18n.translate('xpack.stackAlerts.esQuery.ui.apmAnomaly', {
      defaultMessage: 'APM Anomaly',
    }),
    esqlQuery:
      'FROM .ml-anomalies-* | WHERE @timestamp >= NOW() - 15 minutes AND result_type == "record" AND job_id LIKE "*apm*" | STATS max_score = MAX(record_score) BY job_id | WHERE max_score > 75',
    dropdownDisplay: (
      <>
        <strong>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.apmAnomaly', {
            defaultMessage: 'APM Anomaly',
          })}
        </strong>
        <div>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.apmAnomalyDescription', {
            defaultMessage: 'Alert on APM anomaly detection',
          })}
        </div>
        <div
          style={{
            fontSize: '0.85em',
            color: '#69707D',
            marginTop: '4px',
            fontFamily: 'monospace',
          }}
        >
          FROM .ml-anomalies-* | STATS MAX(record_score) BY job_id
        </div>
      </>
    ),
  },
  {
    value: 'observability.rules.custom_threshold',
    inputDisplay: i18n.translate('xpack.stackAlerts.esQuery.ui.customThreshold', {
      defaultMessage: 'Custom threshold',
    }),
    esqlQuery:
      'FROM metrics-* | WHERE @timestamp >= NOW() - 5 minutes | STATS avg_value = AVG(system.network.in.bytes) BY host.name | WHERE avg_value > 100000',
    dropdownDisplay: (
      <>
        <strong>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.customThreshold', {
            defaultMessage: 'Custom threshold',
          })}
        </strong>
        <div>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.customThresholdDescription', {
            defaultMessage: 'Alert when any Observability data type reaches or exceeds a threshold',
          })}
        </div>
        <div
          style={{
            fontSize: '0.85em',
            color: '#69707D',
            marginTop: '4px',
            fontFamily: 'monospace',
          }}
        >
          FROM metrics-* | STATS avg_value = AVG(field) BY dimension
        </div>
      </>
    ),
  },
  {
    value: 'slo.rules.burnRate',
    inputDisplay: i18n.translate('xpack.stackAlerts.esQuery.ui.sloBurnRate', {
      defaultMessage: 'SLO burn rate',
    }),
    esqlQuery:
      'FROM .slo-observability.sli-* | WHERE @timestamp >= NOW() - 1 hour | STATS good = SUM(slo.numerator), total = SUM(slo.denominator) BY slo.id | EVAL sli = good / total, error_budget_remaining = 1 - sli | WHERE error_budget_remaining < 0.02',
    dropdownDisplay: (
      <>
        <strong>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.sloBurnRate', {
            defaultMessage: 'SLO burn rate',
          })}
        </strong>
        <div>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.sloBurnRateDescription', {
            defaultMessage: 'Alert when SLO burn rate exceeds threshold',
          })}
        </div>
        <div
          style={{
            fontSize: '0.85em',
            color: '#69707D',
            marginTop: '4px',
            fontFamily: 'monospace',
          }}
        >
          FROM .slo-observability.sli-* | EVAL sli = good / total
        </div>
      </>
    ),
  },
  {
    value: 'xpack.synthetics.alerts.monitorStatus',
    inputDisplay: i18n.translate('xpack.stackAlerts.esQuery.ui.syntheticsMonitorStatus', {
      defaultMessage: 'Synthetics monitor status',
    }),
    esqlQuery:
      'FROM synthetics-* | WHERE @timestamp >= NOW() - 5 minutes AND monitor.status == "down" | STATS down_count = COUNT(*) BY monitor.name | WHERE down_count >= 3',
    dropdownDisplay: (
      <>
        <strong>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.syntheticsMonitorStatus', {
            defaultMessage: 'Synthetics monitor status',
          })}
        </strong>
        <div>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.syntheticsMonitorStatusDescription', {
            defaultMessage: 'Alert when a Synthetics monitor is down',
          })}
        </div>
        <div
          style={{
            fontSize: '0.85em',
            color: '#69707D',
            marginTop: '4px',
            fontFamily: 'monospace',
          }}
        >
          FROM synthetics-* | WHERE monitor.status == &quot;down&quot;
        </div>
      </>
    ),
  },
  {
    value: 'xpack.synthetics.alerts.tls',
    inputDisplay: i18n.translate('xpack.stackAlerts.esQuery.ui.syntheticsTls', {
      defaultMessage: 'Synthetics TLS certificate',
    }),
    esqlQuery:
      'FROM synthetics-* | WHERE @timestamp >= NOW() - 15 minutes AND tls.certificate.not_after IS NOT NULL | EVAL days_until_expiry = (tls.certificate.not_after - @timestamp) / 86400000 | WHERE days_until_expiry < 30 | STATS min_days = MIN(days_until_expiry) BY monitor.name',
    dropdownDisplay: (
      <>
        <strong>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.syntheticsTls', {
            defaultMessage: 'Synthetics TLS certificate',
          })}
        </strong>
        <div>
          {i18n.translate('xpack.stackAlerts.esQuery.ui.syntheticsTlsDescription', {
            defaultMessage: 'Alert when TLS certificate is about to expire',
          })}
        </div>
        <div
          style={{
            fontSize: '0.85em',
            color: '#69707D',
            marginTop: '4px',
            fontFamily: 'monospace',
          }}
        >
          FROM synthetics-* | EVAL days_until_expiry = (tls.certificate.not_after - @timestamp)
        </div>
      </>
    ),
  },
];

export const EsqlQueryExpression: React.FC<
  RuleTypeParamsExpressionProps<EsQueryRuleParams<SearchType.esqlQuery>, EsQueryRuleMetaData>
> = ({ ruleParams, metadata, setRuleParams, setRuleProperty, errors, data }) => {
  const services = useTriggerUiActionServices();
  const { http, isServerless, dataViews, uiSettings } = services;
  const { esqlQuery, timeWindowSize, timeWindowUnit, timeField, groupBy } = ruleParams;
  const isEdit = !!metadata?.isEdit;

  const [currentRuleParams, setCurrentRuleParams] = useState<
    EsQueryRuleParams<SearchType.esqlQuery>
  >({
    ...ruleParams,
    timeWindowSize: timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE,
    timeWindowUnit: timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT,
    // ESQL queries compare conditions within the ES query
    // so only 'met' results are returned, therefore the threshold should always be 0
    threshold: [0],
    thresholdComparator: DEFAULT_VALUES.THRESHOLD_COMPARATOR,
    size: isServerless ? SERVERLESS_DEFAULT_VALUES.SIZE : DEFAULT_VALUES.SIZE,
    esqlQuery: esqlQuery ?? { esql: '' },
    aggType: DEFAULT_VALUES.AGGREGATION_TYPE,
    groupBy: groupBy ?? DEFAULT_VALUES.GROUP_BY,
    termSize: DEFAULT_VALUES.TERM_SIZE,
    searchType: SearchType.esqlQuery,
    // The sourceFields param is ignored
    sourceFields: [],
  });
  const [query, setQuery] = useState<AggregateQuery>(esqlQuery ?? { esql: '' });
  const [timeFieldOptions, setTimeFieldOptions] = useState([firstFieldOption]);
  const [detectedTimestamp, setDetectedTimestamp] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [radioIdSelected, setRadioIdSelected] = useState(groupBy ?? ALL_DOCUMENTS);
  const [keepWarning, setKeepWarning] = useState<string | undefined>(undefined);
  const [touched, setTouched] = useState<boolean>(false);
  const [selectedObservabilityRule, setSelectedObservabilityRule] = useState<string>(
    observabilityRuleOptions[0].value
  );

  useDebounce(
    () => {
      if (isEdit) {
        return;
      }
      const {
        ast: { commands },
        tokens,
      } = EsqlQuery.fromSrc(query.esql);

      if (!commands.some((command) => command.name === 'keep')) {
        const lastLine = tokens[tokens.length - 1];
        setKeepWarning(`"Line ${lastLine?.line || 1}:0: ${keepRecommendedWarning}"`);
      } else {
        setKeepWarning(undefined);
      }
    },
    500,
    [isEdit, query]
  );

  const setParam = useCallback(
    (paramField: string, paramValue: unknown) => {
      setCurrentRuleParams((currentParams) => ({
        ...currentParams,
        [paramField]: paramValue,
      }));
      setRuleParams(paramField, paramValue);
    },
    [setRuleParams]
  );

  const clearParam = useCallback(
    (paramField: string) => {
      setCurrentRuleParams((currentParams) => {
        const nextParams = { ...currentParams };
        delete nextParams[paramField];
        return nextParams;
      });
      setRuleParams(paramField, undefined);
    },
    [setRuleParams]
  );

  const setDefaultExpressionValues = () => {
    setRuleProperty('params', currentRuleParams);
    if (esqlQuery?.esql) {
      refreshTimeFields(esqlQuery);
    }
  };

  useEffect(() => {
    setDefaultExpressionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTestQuery = useCallback(async () => {
    const isGroupAgg = isPerRowAggregation(groupBy);
    const window = `${timeWindowSize}${timeWindowUnit}`;
    const emptyResult = {
      testResults: { results: [], truncated: false },
      isGrouped: true,
      timeWindow: window,
    };

    if (hasExpressionValidationErrors(currentRuleParams, isServerless)) {
      return emptyResult;
    }
    setIsLoading(true);
    const timeWindow = parseDuration(window);
    const now = Date.now();
    const timeFilter = getTimeFilter(data.query, uiSettings, timeField);
    const table = await getESQLResults({
      esqlQuery: esqlQuery.esql,
      search: data.search.search,
      dropNullColumns: true,
      timeRange: {
        from: new Date(now - timeWindow).toISOString(),
        to: new Date(now).toISOString(),
      },
      filter: timeFilter,
    });
    if (table.response) {
      const esqlTable = transformToEsqlTable(table.response);
      const { results, duplicateAlertIds, longAlertIds, rows, cols } = await getEsqlQueryHits(
        esqlTable,
        esqlQuery.esql,
        isGroupAgg,
        true
      );
      const warning = getWarning(duplicateAlertIds, longAlertIds);

      setIsLoading(false);
      return {
        testResults: parseAggregationResults(results),
        isGrouped: isGroupAgg,
        isGroupedByRow: isGroupAgg,
        timeWindow: window,
        preview: {
          cols,
          rows,
        },
        ...(warning
          ? {
              warning,
            }
          : {}),
      };
    }
    setIsLoading(false);
    return emptyResult;
  }, [
    timeWindowSize,
    timeWindowUnit,
    currentRuleParams,
    esqlQuery,
    data.query,
    uiSettings,
    data.search.search,
    timeField,
    isServerless,
    groupBy,
  ]);

  const refreshTimeFields = useCallback(
    async (q: AggregateQuery) => {
      const fetchTimeFieldsData = async (queryObj: AggregateQuery) => {
        try {
          const esqlDataView = await getESQLAdHocDataview(queryObj.esql, dataViews);
          const indexPattern: string = esqlDataView.getIndexPattern();
          const currentEsFields = await getFields(http, [indexPattern]);
          const newTimeFieldOptions = getTimeFieldOptions(currentEsFields);
          const timestampField = esqlDataView.timeFieldName;
          return { newTimeFieldOptions, timestampField };
        } catch (e) {
          return { newTimeFieldOptions: [], timestampField: undefined };
        }
      };

      const { newTimeFieldOptions, timestampField } = await fetchTimeFieldsData(q);
      setTimeFieldOptions([firstFieldOption, ...newTimeFieldOptions]);
      if (!timeField && timestampField) {
        setParam('timeField', timestampField);
      }
      if (!newTimeFieldOptions.find(({ value }) => value === timeField)) {
        clearParam('timeField');
      }
      setDetectedTimestamp(timestampField);
    },
    [timeField, setParam, clearParam, dataViews, http]
  );

  return (
    <Fragment>
      <EuiFormRow
        id="observabilityRuleType"
        fullWidth
        label={
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.selectObservabilityRulePrompt"
            defaultMessage="Observability rule templates"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.observabilityRuleHelpText"
            defaultMessage="Select an observability rule type for reference"
          />
        }
      >
        <EuiSuperSelect
          options={observabilityRuleOptions}
          valueOfSelected={selectedObservabilityRule}
          onChange={(value) => {
            setSelectedObservabilityRule(value);
            const selectedOption = observabilityRuleOptions.find(
              (option) => option.value === value
            );
            if (selectedOption && selectedOption.esqlQuery) {
              const newQuery = { esql: selectedOption.esqlQuery };
              setQuery(newQuery);
              setParam('esqlQuery', newQuery);
              refreshTimeFields(newQuery);
            }
          }}
          data-test-subj="observabilityRuleTypeSelect"
          fullWidth
        />
      </EuiFormRow>
      <EuiFormRow id="queryEditor" data-test-subj="queryEsqlEditor" fullWidth>
        <ESQLLangEditor
          query={query}
          onTextLangQueryChange={(q: AggregateQuery) => {
            setTouched(true);
            setQuery(q);
            setParam('esqlQuery', q);
            refreshTimeFields(q);
          }}
          warning={touched && keepWarning ? keepWarning : undefined}
          onTextLangQuerySubmit={async () => {}}
          detectedTimestamp={detectedTimestamp}
          hideRunQueryText
          hideRunQueryButton
          isLoading={isLoading}
          editorIsInline
          expandToFitQueryOnMount
          hasOutline
          mergeExternalMessages
        />
      </EuiFormRow>
      <EuiSpacer />
      <TestQueryRow
        fetch={onTestQuery}
        hasValidationErrors={hasExpressionValidationErrors(currentRuleParams, isServerless)}
        showTable
      />
      <EuiSpacer />
      <EuiFormRow
        id="timeField"
        fullWidth
        // @ts-expect-error upgrade typescript v5.1.6
        isInvalid={errors.timeField.length > 0 && timeField !== undefined}
        error={errors.timeField as string[]}
        label={
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.selectEsqlQueryTimeFieldPrompt"
            defaultMessage="Select a time field"
          />
        }
      >
        <EuiSelect
          options={timeFieldOptions}
          // @ts-expect-error upgrade typescript v5.1.6
          isInvalid={errors.timeField.length > 0 && timeField !== undefined}
          fullWidth
          name="timeField"
          data-test-subj="timeFieldSelect"
          value={timeField || ''}
          onChange={(e) => {
            setParam('timeField', e.target.value);
          }}
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiFormRow
        id="alertGroup"
        fullWidth
        // @ts-expect-error upgrade typescript v5.1.6
        isInvalid={errors.groupBy.length > 0 && groupBy !== undefined}
        error={errors.groupBy as string[]}
        label={
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.selectEsqlQueryGroupByPrompt"
            defaultMessage="Select alert group"
          />
        }
      >
        <EuiRadioGroup
          data-test-subj="groupByRadioGroup"
          options={alertingOptions}
          idSelected={radioIdSelected}
          onChange={(optionId) => {
            setRadioIdSelected(optionId);
            setParam('groupBy', optionId);
          }}
          name="alertGroup"
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiFlexGroup alignItems="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id="timeWindowSize"
            // @ts-expect-error upgrade typescript v5.1.6
            isInvalid={errors.timeWindowSize.length > 0}
            error={errors.timeWindowSize as string[]}
            label={
              <FormattedMessage
                id="xpack.stackAlerts.esQuery.ui.setEsqlQueryTimeWindowPrompt"
                defaultMessage="Set the time window"
              />
            }
          >
            <EuiFieldNumber
              name="timeWindowSize"
              data-test-subj="timeWindowSizeNumber"
              // @ts-expect-error upgrade typescript v5.1.6
              isInvalid={errors.timeWindowSize.length > 0}
              min={0}
              value={timeWindowSize || ''}
              onChange={(e) => {
                const { value } = e.target;
                const timeWindowSizeVal = value !== '' ? parseInt(value, 10) : undefined;
                setParam('timeWindowSize', timeWindowSizeVal);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow id="timeWindowUnit">
            <EuiSelect
              name="timeWindowUnit"
              data-test-subj="timeWindowUnitSelect"
              value={timeWindowUnit}
              onChange={(e) => {
                setParam('timeWindowUnit', e.target.value);
              }}
              options={getTimeOptions(timeWindowSize ?? 1)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};
