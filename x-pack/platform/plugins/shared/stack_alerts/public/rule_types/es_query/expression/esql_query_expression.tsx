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
} from '@elastic/eui';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { getFields } from '@kbn/triggers-actions-ui-plugin/public';
import { ESQLLangEditor } from '@kbn/esql/public';
import { getESQLAdHocDataview, getESQLResults } from '@kbn/esql-utils';
import { type AggregateQuery } from '@kbn/es-query';
import { parseDuration } from '@kbn/alerting-plugin/common';
import {
  firstFieldOption,
  getTimeFieldOptions,
  getTimeOptions,
  isPerRowAggregation,
  parseAggregationResults,
} from '@kbn/triggers-actions-ui-plugin/public/common';
import { EsqlQuery } from '@kbn/esql-language';
import useDebounce from 'react-use/lib/useDebounce';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import type { EsQueryRuleParams, EsQueryRuleMetaData } from '../types';
import { SearchType } from '../types';
import { DEFAULT_VALUES, SERVERLESS_DEFAULT_VALUES } from '../constants';
import { useTriggerUiActionServices } from '../util';
import { hasExpressionValidationErrors } from '../validation';
import { TestQueryRow } from '../test_query_row';
import { transformToEsqlTable, getEsqlQueryHits, ALERT_ID_SUGGESTED_MAX } from '../../../../common';

export const getTimeFilter = (timeField: string, window: string) => {
  const timeWindow = parseDuration(window);
  const now = Date.now();
  const dateEnd = new Date(now).toISOString();
  const dateStart = new Date(now - timeWindow).toISOString();
  return {
    timeRange: {
      from: dateStart,
      to: dateEnd,
    },
    timeFilter: {
      bool: {
        filter: [
          {
            range: {
              [timeField]: {
                lte: dateEnd,
                gt: dateStart,
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
  };
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

export const EsqlQueryExpression: React.FC<
  RuleTypeParamsExpressionProps<EsQueryRuleParams<SearchType.esqlQuery>, EsQueryRuleMetaData>
> = ({ ruleParams, metadata, setRuleParams, setRuleProperty, errors, data }) => {
  const { http, isServerless, dataViews, uiSettings } = useTriggerUiActionServices();
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [radioIdSelected, setRadioIdSelected] = useState(groupBy ?? ALL_DOCUMENTS);
  const [keepWarning, setKeepWarning] = useState<string | undefined>(undefined);
  const [touched, setTouched] = useState<boolean>(false);

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
    const { timeFilter, timeRange } = getTimeFilter(timeField, window);
    const timezone = uiSettings?.get<'Browser' | string>(UI_SETTINGS.DATEFORMAT_TZ);

    const table = await getESQLResults({
      esqlQuery: esqlQuery.esql,
      search: data.search.search,
      dropNullColumns: true,
      timeRange,
      timezone,
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
    data.search.search,
    uiSettings,
    timeField,
    isServerless,
    groupBy,
  ]);

  const refreshTimeFields = useCallback(
    async (q: AggregateQuery) => {
      const fetchTimeFieldsData = async (queryObj: AggregateQuery) => {
        try {
          const esqlDataView = await getESQLAdHocDataview({
            dataViewsService: dataViews,
            query: queryObj.esql,
            http,
          });
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
    },
    [timeField, setParam, clearParam, dataViews, http]
  );

  return (
    <Fragment>
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
