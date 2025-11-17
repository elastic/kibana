/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, useEffect, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiFieldText,
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
} from '@kbn/triggers-actions-ui-plugin/public/common';
import type { ESQLRuleParams, ESQLRuleMetaData } from '../types';
import { DEFAULT_VALUES } from '../constants';
import { useTriggerUiActionServices } from '../util';
import { hasExpressionValidationErrors } from '../validation';
import { TestQueryRow } from '../test_query_row';
import { transformToEsqlTable, getEsqlQueryHits } from '../../../../common/esql';

export const EsqlQueryExpression: React.FC<
  RuleTypeParamsExpressionProps<ESQLRuleParams, ESQLRuleMetaData>
> = ({ ruleParams, setRuleParams, setRuleProperty, errors, data }) => {
  const { http, dataViews } = useTriggerUiActionServices();
  const { esqlQuery, timeWindowSize, timeWindowUnit, timeField, familyId } = ruleParams;

  const [currentRuleParams, setCurrentRuleParams] = useState<ESQLRuleParams>({
    ...ruleParams,
    timeWindowSize: timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE,
    timeWindowUnit: timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT,
    esqlQuery: esqlQuery ?? { esql: '' },
    familyId: 'esql-family-id',
  });
  const [query, setQuery] = useState<AggregateQuery>(esqlQuery ?? { esql: '' });
  const [timeFieldOptions, setTimeFieldOptions] = useState([firstFieldOption]);
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
    if (esqlQuery?.esql) {
      refreshTimeFields(esqlQuery);
    }
  };

  useEffect(() => {
    setDefaultExpressionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTestQuery = useCallback(async () => {
    const window = `${timeWindowSize}${timeWindowUnit}`;
    const emptyResult = {
      timeWindow: window,
    };

    if (hasExpressionValidationErrors(currentRuleParams)) {
      return emptyResult;
    }
    setIsLoading(true);
    const timeWindow = parseDuration(window);
    const now = Date.now();
    const dateEnd = new Date(now).toISOString();
    const dateStart = new Date(now - timeWindow).toISOString();
    const table = await getESQLResults({
      esqlQuery: esqlQuery.esql,
      search: data.search.search,
      dropNullColumns: true,
      timeRange: {
        from: dateStart,
        to: dateEnd,
      },
      filter: {
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
    });

    if (table.response) {
      const esqlTable = transformToEsqlTable(table.response);
      const { rows, cols } = await getEsqlQueryHits(esqlQuery.esql, esqlTable, true);
      setIsLoading(false);
      return {
        timeWindow: window,
        preview: {
          cols,
          rows,
        },
      };
    }
    setIsLoading(false);
    return emptyResult;
  }, [timeWindowSize, timeWindowUnit, currentRuleParams, esqlQuery, data.search.search, timeField]);

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
      <EuiFormRow id="queryEditor" data-test-subj="queryEsqlEditor" fullWidth>
        <ESQLLangEditor
          query={query}
          onTextLangQueryChange={(q: AggregateQuery) => {
            setQuery(q);
            setParam('esqlQuery', q);
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
          mergeExternalMessages
        />
      </EuiFormRow>
      <EuiSpacer />
      <TestQueryRow
        fetch={onTestQuery}
        hasValidationErrors={hasExpressionValidationErrors(currentRuleParams)}
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
            id="xpack.stackAlerts.esql.ui.selectEsqlQueryTimeFieldPrompt"
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
      <EuiFlexGroup alignItems="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id="timeWindowSize"
            // @ts-expect-error upgrade typescript v5.1.6
            isInvalid={errors.timeWindowSize.length > 0}
            error={errors.timeWindowSize as string[]}
            label={
              <FormattedMessage
                id="xpack.stackAlerts.esql.ui.setEsqlQueryTimeWindowPrompt"
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
      <EuiSpacer />
      <EuiFormRow
        id="familyId"
        fullWidth
        // @ts-expect-error upgrade typescript v5.1.6
        isInvalid={errors.familyId.length > 0 && familyId !== undefined}
        error={errors.familyId as string[]}
        label={
          <FormattedMessage
            id="xpack.stackAlerts.esql.ui.selectEsqlQueryFamilyIdFieldPrompt"
            defaultMessage="Family ID"
          />
        }
      >
        <EuiFieldText
          value={familyId || ''}
          onChange={(e) => setParam('familyId', e.target.value)}
        />
      </EuiFormRow>
    </Fragment>
  );
};
