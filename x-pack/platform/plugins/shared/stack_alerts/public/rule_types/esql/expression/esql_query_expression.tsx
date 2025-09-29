/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSpacer } from '@elastic/eui';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { getFields } from '@kbn/triggers-actions-ui-plugin/public';
import { ESQLLangEditor } from '@kbn/esql/public';
import { fetchFieldsFromESQL } from '@kbn/esql-editor';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import type { AggregateQuery } from '@kbn/es-query';
import { parseDuration } from '@kbn/alerting-plugin/common';
import {
  firstFieldOption,
  getTimeFieldOptions,
  isPerRowAggregation,
  parseAggregationResults,
} from '@kbn/triggers-actions-ui-plugin/public/common';
import type { EsQueryRuleParams, EsQueryRuleMetaData } from '../types';
import { SearchType } from '../types';
import { DEFAULT_VALUES, SERVERLESS_DEFAULT_VALUES } from '../constants';
import { useTriggerUiActionServices } from '../util';
import { hasExpressionValidationErrors } from '../validation';
import { TestQueryRow } from '../test_query_row';
import {
  transformDatatableToEsqlTable,
  getEsqlQueryHits,
  ALERT_ID_SUGGESTED_MAX,
} from '../../../../common';

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

export const EsqlQueryExpression: React.FC<
  RuleTypeParamsExpressionProps<EsQueryRuleParams<SearchType.esqlQuery>, EsQueryRuleMetaData>
> = ({ ruleParams, setRuleParams, setRuleProperty, errors }) => {
  const { expressions, http, isServerless, dataViews } = useTriggerUiActionServices();
  const { query: esqlQuery, timeWindowSize, timeWindowUnit, timeField, groupBy } = ruleParams;

  const [currentRuleParams, setCurrentRuleParams] = useState<
    EsQueryRuleParams<SearchType.esqlQuery>
  >({
    ...ruleParams,
    query: { esql: '' },
  });
  const [query, setQuery] = useState<string>(esqlQuery ?? '');
  const [, setTimeFieldOptions] = useState([firstFieldOption]);
  const [detectedTimestamp, setDetectedTimestamp] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
    if (esqlQuery) {
      refreshTimeFields({ esql: esqlQuery });
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
    const table = await fetchFieldsFromESQL(
      { esql: esqlQuery },
      expressions,
      {
        from: new Date(now - timeWindow).toISOString(),
        to: new Date(now).toISOString(),
      },
      undefined,
      // create a data view with the timefield to pass into the query
      timeField
    );
    if (table) {
      const esqlTable = transformDatatableToEsqlTable(table);
      const { results, duplicateAlertIds, longAlertIds, rows, cols } = await getEsqlQueryHits(
        esqlTable,
        esqlQuery,
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
    expressions,
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
      if (!newTimeFieldOptions.find(({ value }) => value === timeField)) {
        clearParam('timeField');
      }
      setDetectedTimestamp(timestampField);
    },
    [timeField, clearParam, dataViews, http]
  );

  return (
    <Fragment>
      <EuiFormRow id="queryEditor" data-test-subj="queryEsqlEditor" fullWidth>
        <ESQLLangEditor
          query={{ esql: query }}
          onTextLangQueryChange={(q: AggregateQuery) => {
            setQuery(q.esql);
            setParam('query', q.esql);
            refreshTimeFields(q);
          }}
          onTextLangQuerySubmit={async () => {}}
          detectedTimestamp={detectedTimestamp}
          hideRunQueryText
          hideRunQueryButton
          isLoading={isLoading}
          editorIsInline
          expandToFitQueryOnMount
          hasOutline
        />
      </EuiFormRow>
      <EuiSpacer />
      <TestQueryRow
        fetch={onTestQuery}
        hasValidationErrors={hasExpressionValidationErrors(currentRuleParams, isServerless)}
        showTable
      />
    </Fragment>
  );
};
