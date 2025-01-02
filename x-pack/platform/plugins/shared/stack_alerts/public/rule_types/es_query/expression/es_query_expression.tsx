/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, useEffect, useCallback } from 'react';
import { get, sortBy } from 'lodash';
import { lastValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiFormRow, EuiLink, EuiSpacer } from '@elastic/eui';

import { XJson } from '@kbn/es-ui-shared-plugin/public';
import { CodeEditor } from '@kbn/code-editor';
import { getFields, RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import { parseDuration } from '@kbn/alerting-plugin/common';
import {
  FieldOption,
  buildAggregation,
  parseAggregationResults,
  isGroupAggregation,
  isCountAggregation,
  BUCKET_SELECTOR_FIELD,
} from '@kbn/triggers-actions-ui-plugin/public/common';
import { Comparator } from '../../../../common/comparator_types';
import { getComparatorScript } from '../../../../common';
import { hasExpressionValidationErrors } from '../validation';
import { buildSortedEventsQuery } from '../../../../common/build_sorted_events_query';
import { EsQueryRuleParams, EsQueryRuleMetaData, SearchType, SourceField } from '../types';
import { IndexSelectPopover } from '../../components/index_select_popover';
import { DEFAULT_VALUES, SERVERLESS_DEFAULT_VALUES } from '../constants';
import { RuleCommonExpressions } from '../rule_common_expressions';
import { convertRawRuntimeFieldtoFieldOption, useTriggerUiActionServices } from '../util';

const { useXJsonMode } = XJson;

export const EsQueryExpression: React.FC<
  RuleTypeParamsExpressionProps<EsQueryRuleParams<SearchType.esQuery>, EsQueryRuleMetaData>
> = ({ ruleParams, setRuleParams, setRuleProperty, errors, data }) => {
  const services = useTriggerUiActionServices();
  const { http, docLinks, isServerless } = services;

  const {
    index,
    timeField,
    esQuery,
    size,
    thresholdComparator,
    threshold,
    timeWindowSize,
    timeWindowUnit,
    aggType,
    aggField,
    groupBy,
    termSize,
    termField,
    excludeHitsFromPreviousRun,
    sourceFields,
  } = ruleParams;

  const [currentRuleParams, setCurrentRuleParams] = useState<EsQueryRuleParams<SearchType.esQuery>>(
    {
      ...ruleParams,
      timeWindowSize: timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE,
      timeWindowUnit: timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT,
      threshold: threshold ?? DEFAULT_VALUES.THRESHOLD,
      thresholdComparator: thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR,
      size: size ? size : isServerless ? SERVERLESS_DEFAULT_VALUES.SIZE : DEFAULT_VALUES.SIZE,
      esQuery: esQuery ?? DEFAULT_VALUES.QUERY,
      aggType: aggType ?? DEFAULT_VALUES.AGGREGATION_TYPE,
      groupBy: groupBy ?? DEFAULT_VALUES.GROUP_BY,
      termSize: termSize ?? DEFAULT_VALUES.TERM_SIZE,
      searchType: SearchType.esQuery,
      excludeHitsFromPreviousRun:
        excludeHitsFromPreviousRun ?? DEFAULT_VALUES.EXCLUDE_PREVIOUS_HITS,
      sourceFields,
    }
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

  const [esFields, setEsFields] = useState<FieldOption[]>([]);
  const [runtimeFields, setRuntimeFields] = useState<FieldOption[]>([]);
  const [combinedFields, setCombinedFields] = useState<FieldOption[]>([]);
  const { convertToJson, setXJson, xJson } = useXJsonMode(DEFAULT_VALUES.QUERY);

  const setDefaultExpressionValues = async () => {
    setRuleProperty('params', currentRuleParams);
    setXJson(esQuery ?? DEFAULT_VALUES.QUERY);

    if (index && index.length > 0) {
      await refreshEsFields(index);
    }
  };

  useEffect(() => {
    setDefaultExpressionValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshEsFields = async (indices: string[]) => {
    const currentEsFields = await getFields(http, indices);
    setEsFields(currentEsFields);
    setCombinedFields(sortBy(currentEsFields.concat(runtimeFields), 'name'));
  };

  const getRuntimeFields = (xjson: string) => {
    let runtimeMappings;
    try {
      runtimeMappings = get(JSON.parse(xjson), 'runtime_mappings');
    } catch (e) {
      // ignore error
    }
    if (runtimeMappings) {
      const currentRuntimeFields = convertRawRuntimeFieldtoFieldOption(runtimeMappings);
      setRuntimeFields(currentRuntimeFields);
      setCombinedFields(sortBy(esFields.concat(currentRuntimeFields), 'name'));
    }
  };

  const onTestQuery = useCallback(async () => {
    const isGroupAgg = isGroupAggregation(termField);
    const isCountAgg = isCountAggregation(aggType);
    const window = `${timeWindowSize}${timeWindowUnit}`;
    if (hasExpressionValidationErrors(currentRuleParams, isServerless)) {
      return {
        testResults: { results: [], truncated: false },
        isGrouped: isGroupAgg,
        timeWindow: window,
      };
    }
    const timeWindow = parseDuration(window);
    const parsedQuery = JSON.parse(esQuery);
    const now = Date.now();
    const { rawResponse } = await lastValueFrom(
      data.search.search({
        params: buildSortedEventsQuery({
          index,
          from: new Date(now - timeWindow).toISOString(),
          to: new Date(now).toISOString(),
          filter: parsedQuery.query,
          size: 0,
          searchAfterSortId: undefined,
          timeField: timeField ? timeField : '',
          track_total_hits: true,
          aggs: buildAggregation({
            aggType,
            aggField,
            termField,
            termSize,
            condition: {
              conditionScript: getComparatorScript(
                (thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR) as Comparator,
                threshold,
                BUCKET_SELECTOR_FIELD
              ),
            },
          }),
        }),
      })
    );

    return {
      testResults: parseAggregationResults({ isCountAgg, isGroupAgg, esResult: rawResponse }),
      isGrouped: isGroupAgg,
      timeWindow: window,
    };
  }, [
    timeWindowSize,
    timeWindowUnit,
    currentRuleParams,
    esQuery,
    data.search,
    index,
    timeField,
    aggType,
    aggField,
    termField,
    termSize,
    threshold,
    thresholdComparator,
    isServerless,
  ]);

  return (
    <Fragment>
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.selectIndexPrompt"
            defaultMessage="Select indices"
          />
        }
      >
        <IndexSelectPopover
          index={index}
          data-test-subj="indexSelectPopover"
          esFields={esFields}
          timeField={timeField}
          errors={errors}
          onIndexChange={async (indices: string[]) => {
            setParam('index', indices);

            // reset expression fields if indices are deleted
            if (indices.length === 0) {
              setRuleProperty('params', {
                timeField: ruleParams.timeField,
                index: indices,
                esQuery: DEFAULT_VALUES.QUERY,
                size: DEFAULT_VALUES.SIZE,
                thresholdComparator: DEFAULT_VALUES.THRESHOLD_COMPARATOR,
                timeWindowSize: DEFAULT_VALUES.TIME_WINDOW_SIZE,
                timeWindowUnit: DEFAULT_VALUES.TIME_WINDOW_UNIT,
                threshold: DEFAULT_VALUES.THRESHOLD,
                aggType: DEFAULT_VALUES.AGGREGATION_TYPE,
                groupBy: DEFAULT_VALUES.GROUP_BY,
                termSize: DEFAULT_VALUES.TERM_SIZE,
                searchType: SearchType.esQuery,
                excludeHitsFromPreviousRun: DEFAULT_VALUES.EXCLUDE_PREVIOUS_HITS,
                sourceFields: undefined,
              });
            } else {
              await refreshEsFields(indices);
            }
          }}
          onTimeFieldChange={(updatedTimeField: string) => setParam('timeField', updatedTimeField)}
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <EuiFormRow
        id="queryEditor"
        data-test-subj="queryJsonEditor"
        fullWidth
        // @ts-expect-error upgrade typescript v5.1.6
        isInvalid={errors.esQuery.length > 0}
        error={errors.esQuery as string[]}
        helpText={
          <EuiLink href={docLinks.links.query.queryDsl} target="_blank">
            <FormattedMessage
              id="xpack.stackAlerts.esQuery.ui.queryPrompt.help"
              defaultMessage="Elasticsearch Query DSL documentation"
            />
          </EuiLink>
        }
        label={
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.defineQueryPrompt"
            defaultMessage="Define your query using Query DSL"
          />
        }
      >
        <CodeEditor
          languageId="xjson"
          width="100%"
          height="200px"
          value={xJson}
          onChange={(xjson: string) => {
            setXJson(xjson);
            setParam('esQuery', convertToJson(xjson));
            getRuntimeFields(xjson);
          }}
          options={{
            ariaLabel: i18n.translate('xpack.stackAlerts.esQuery.ui.queryEditor', {
              defaultMessage: 'Elasticsearch query editor',
            }),
            wordWrap: 'off',
            tabSize: 2,
            lineNumbers: 'off',
            lineNumbersMinChars: 0,
            folding: false,
            lineDecorationsWidth: 0,
            overviewRulerBorder: false,
          }}
        />
      </EuiFormRow>

      <EuiSpacer size="s" />

      <RuleCommonExpressions
        threshold={threshold ?? DEFAULT_VALUES.THRESHOLD}
        thresholdComparator={thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR}
        timeWindowSize={timeWindowSize}
        timeWindowUnit={timeWindowUnit}
        size={size}
        esFields={combinedFields}
        aggType={aggType}
        aggField={aggField}
        groupBy={groupBy}
        termSize={termSize}
        termField={termField}
        onChangeSelectedAggField={useCallback(
          (selectedAggField?: string) => setParam('aggField', selectedAggField),
          [setParam]
        )}
        onChangeSelectedAggType={useCallback(
          (selectedAggType: string) => setParam('aggType', selectedAggType),
          [setParam]
        )}
        onChangeSelectedGroupBy={useCallback(
          (selectedGroupBy: string | undefined) => setParam('groupBy', selectedGroupBy),
          [setParam]
        )}
        onChangeSelectedTermField={useCallback(
          (selectedTermField: string | string[] | undefined) =>
            setParam('termField', selectedTermField),
          [setParam]
        )}
        onChangeSelectedTermSize={useCallback(
          (selectedTermSize?: number) => setParam('termSize', selectedTermSize),
          [setParam]
        )}
        onChangeThreshold={useCallback(
          (selectedThresholds: number[] | undefined) => setParam('threshold', selectedThresholds),
          [setParam]
        )}
        onChangeThresholdComparator={useCallback(
          (selectedThresholdComparator: string | undefined) =>
            setParam('thresholdComparator', selectedThresholdComparator),
          [setParam]
        )}
        onChangeWindowSize={useCallback(
          (selectedWindowSize: number | undefined) =>
            setParam('timeWindowSize', selectedWindowSize),
          [setParam]
        )}
        onChangeWindowUnit={useCallback(
          (selectedWindowUnit: string) => setParam('timeWindowUnit', selectedWindowUnit),
          [setParam]
        )}
        onChangeSizeValue={useCallback(
          (updatedValue: number) => setParam('size', updatedValue),
          [setParam]
        )}
        errors={errors}
        hasValidationErrors={hasExpressionValidationErrors(currentRuleParams, isServerless)}
        onTestFetch={onTestQuery}
        excludeHitsFromPreviousRun={
          excludeHitsFromPreviousRun ?? DEFAULT_VALUES.EXCLUDE_PREVIOUS_HITS
        }
        onChangeExcludeHitsFromPreviousRun={useCallback(
          (exclude: boolean) => setParam('excludeHitsFromPreviousRun', exclude),
          [setParam]
        )}
        canSelectMultiTerms={DEFAULT_VALUES.CAN_SELECT_MULTI_TERMS}
        onChangeSourceFields={useCallback(
          (selectedSourceFields: SourceField[]) => setParam('sourceFields', selectedSourceFields),
          [setParam]
        )}
        sourceFields={sourceFields}
      />

      <EuiSpacer />
    </Fragment>
  );
};
