/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiExpression, EuiFormRow, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataViewSelectPopover } from '@kbn/stack-alerts-plugin/public';
import {
  ForLastExpression,
  type RuleTypeParamsExpressionProps,
} from '@kbn/triggers-actions-ui-plugin/public';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { ThresholdExpression } from '@kbn/triggers-actions-ui-plugin/public';
import { DatasetQualityRuleParams } from '@kbn/response-ops-rule-params/dataset_quality/latest';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { i18n } from '@kbn/i18n';
import { isArray } from 'lodash';
import { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import { TimeUnitChar } from '@kbn/response-ops-rule-params/common/utils';
import { DATASET_QUALITY_RULE_RUNTIME_FIELD_NAME } from '../../../common/constants';
import { useKibanaContextForPlugin } from '../../utils';
import { RuleConditionChart } from './rule_condition_chart';

export const defaultRuleParams: Partial<DatasetQualityRuleParams> = {
  comparator: COMPARATORS.GREATER_THAN,
  threshold: [3],
  timeSize: 5,
  timeUnit: 'm',
  groupBy: [DATASET_QUALITY_RULE_RUNTIME_FIELD_NAME],
  type: 'degraded_docs',
};

export type DataStreamGroupByFields = Array<DataViewFieldBase & { aggregatable: boolean }>;

export const RuleForm: React.FunctionComponent<
  RuleTypeParamsExpressionProps<DatasetQualityRuleParams, { adHocDataViewList: DataView[] }>
> = (props) => {
  const {
    services: { dataViews, dataViewEditor },
  } = useKibanaContextForPlugin();

  const { setRuleParams, ruleParams, errors, metadata, onChangeMetaData } = props;
  const { comparator, threshold, timeSize, timeUnit, groupBy } = ruleParams;

  const [dataView, setDataView] = useState<DataView>();
  const [preselectedOptions, _] = useState<string[]>(defaultRuleParams.groupBy ?? []);
  const [adHocDataViews, setAdHocDataViews] = useState<DataView[]>(
    metadata?.adHocDataViewList ?? []
  );

  const preFillProperty = useCallback(
    (property: keyof DatasetQualityRuleParams) => {
      setRuleParams(property, defaultRuleParams[property]);
    },
    [setRuleParams]
  );

  const updateProperty = useCallback(
    (property: keyof DatasetQualityRuleParams, value?: any) => {
      setRuleParams(property, value);
    },
    [setRuleParams]
  );

  useEffect(() => {
    const initDataView = async () => {
      if (ruleParams.name && !dataView) {
        const savedDataViews = await dataViews.getIdsWithTitle();
        const savedDataViewId = savedDataViews.find((dv) => dv.title === ruleParams.name)?.id;

        if (savedDataViewId) {
          setDataView(await dataViews.get(savedDataViewId));
          return;
        }

        let currentDataView: DataView;
        const adHocDataView = adHocDataViews.find((dv) => dv.title === ruleParams.name);

        if (adHocDataView) {
          currentDataView = adHocDataView;
        } else {
          currentDataView = await dataViews.create({
            title: ruleParams.name,
            timeFieldName: '@timestamp',
          });

          setAdHocDataViews((prev) => [...prev, currentDataView]);
        }

        setDataView(currentDataView);
      }
    };

    initDataView();
  }, [adHocDataViews, dataView, dataViews, ruleParams.name]);

  useEffect(() => {
    if (!ruleParams.comparator) {
      preFillProperty('comparator');
    }

    if (!ruleParams.threshold) {
      preFillProperty('threshold');
    }

    if (!ruleParams.timeSize) {
      preFillProperty('timeSize');
    }

    if (!ruleParams.timeUnit) {
      preFillProperty('timeUnit');
    }

    if (!ruleParams.groupBy) {
      preFillProperty('groupBy');
    }

    if (!ruleParams.type) {
      preFillProperty('type');
    }
  }, [
    preFillProperty,
    ruleParams.comparator,
    ruleParams.groupBy,
    ruleParams.name,
    ruleParams.threshold,
    ruleParams.timeSize,
    ruleParams.timeUnit,
    ruleParams.type,
  ]);

  const emptyError = useMemo(() => {
    return {
      timeSizeUnit: [],
      timeWindowSize: [],
    };
  }, []);

  const onGroupByChange = useCallback(
    (group: string | null | string[]) => {
      const gb = group ? (isArray(group) ? group : [group]) : [];
      setRuleParams('groupBy', gb);
    },
    [setRuleParams]
  );

  const derivedIndexPattern = useMemo<DataViewBase>(
    () => ({
      fields: dataView?.fields || [],
      title: dataView?.getIndexPattern() || 'unknown-index',
    }),
    [dataView]
  );

  const onSelectDataView = useCallback(
    (newDataView: DataView) => {
      updateProperty('name', newDataView.getIndexPattern());
      setDataView(newDataView);
    },
    [updateProperty]
  );

  const handleChange = useCallback(
    (selectedOptions: Array<{ label: string }>) => {
      const gb = selectedOptions.map((option) => option.label);

      onGroupByChange([...new Set(preselectedOptions.concat(gb))]);
    },
    [onGroupByChange, preselectedOptions]
  );

  const getPreSelectedOptions = () => {
    return preselectedOptions.map((field) => ({
      label: field,
      color: 'lightgray',
      disabled: true,
    }));
  };

  const getUserSelectedOptions = (group: string[] | undefined) => {
    return (group ?? [])
      .filter((g) => !preselectedOptions.includes(g))
      .map((field) => ({
        label: field,
      }));
  };

  const selectedOptions = [...getPreSelectedOptions(), ...getUserSelectedOptions(groupBy)];

  return (
    <>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.datasetQuality.rule.alertCondition"
            defaultMessage="Alert condition"
          />
        </h5>
      </EuiTitle>

      <EuiSpacer size="m" />

      <DataViewSelectPopover
        dependencies={{ dataViews, dataViewEditor }}
        dataView={dataView}
        metadata={{ adHocDataViewList: adHocDataViews }}
        onSelectDataView={onSelectDataView}
        onChangeMetaData={({ adHocDataViewList }) => {
          onChangeMetaData({ ...metadata, adHocDataViewList });
        }}
      />

      <EuiExpression
        data-test-subj="datasetQualityRuleCountExpression"
        description={'count'}
        value={'degraded docs'} // TODO: Check if this should be translatable
        display="columns"
        onClick={() => {}}
        disabled={true}
      />

      <ThresholdExpression
        thresholdComparator={comparator ?? defaultRuleParams.comparator}
        threshold={threshold}
        onChangeSelectedThresholdComparator={(value) => updateProperty('comparator', value)}
        onChangeSelectedThreshold={(value) => updateProperty('threshold', value)}
        errors={errors}
        display="fullWidth"
        unit={'%'}
      />

      <ForLastExpression
        timeWindowSize={timeSize}
        timeWindowUnit={timeUnit}
        errors={emptyError}
        onChangeWindowSize={(value) => updateProperty('timeSize', value)}
        onChangeWindowUnit={(value) => updateProperty('timeUnit', value)}
        display="fullWidth"
      />

      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.datasetQuality.rule.rulePreview"
            defaultMessage="Rule preview"
          />
        </h5>
      </EuiTitle>

      <EuiSpacer size="m" />

      <RuleConditionChart
        threshold={threshold}
        comparator={comparator as COMPARATORS}
        timeSize={timeSize}
        timeUnit={timeUnit as TimeUnitChar}
        dataView={dataView}
        groupBy={groupBy}
        label={'degraded docs'} // TODO: check this label, it's not being shown in the chart
        timeRange={{ from: `now-${(timeSize ?? 1) * 20}${timeUnit}`, to: 'now' }}
      />

      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.datasetQuality.rule.alertGrouping"
            defaultMessage="Alert grouping"
          />
        </h5>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiFormRow
        label={i18n.translate('xpack.datasetQuality.rule.createAlertPerText', {
          defaultMessage: 'Group alerts by (optional)',
        })}
        helpText={i18n.translate('xpack.datasetQuality.rule.createAlertPerHelpText', {
          defaultMessage:
            'Create an alert for every unique value. For example: "host.id" or "cloud.region".',
        })}
        fullWidth
        display="rowCompressed"
      >
        <EuiComboBox
          data-test-subj="datasetQualityRuleGroupBy"
          placeholder={i18n.translate('xpack.datasetQuality.rule.groupByLabel', {
            defaultMessage: 'Everything',
          })}
          aria-label={i18n.translate('xpack.datasetQuality.rule.groupByAriaLabel', {
            defaultMessage: 'Graph per',
          })}
          fullWidth
          singleSelection={false}
          selectedOptions={selectedOptions}
          options={((derivedIndexPattern.fields as DataStreamGroupByFields) ?? [])
            .filter((f) => f.aggregatable && f.type === 'string')
            .map((f) => ({ label: f.name }))}
          onChange={handleChange}
          isClearable={true}
        />
      </EuiFormRow>
    </>
  );
};
