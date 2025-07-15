/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiExpression,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
  EuiFormErrorText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataViewSelectPopover } from '@kbn/stack-alerts-plugin/public';
import {
  ForLastExpression,
  type RuleTypeParamsExpressionProps,
} from '@kbn/triggers-actions-ui-plugin/public';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { ThresholdExpression } from '@kbn/triggers-actions-ui-plugin/public';
import { DegradedDocsRuleParams } from '@kbn/response-ops-rule-params/degraded_docs';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { i18n } from '@kbn/i18n';
import { isArray } from 'lodash';
import { DataViewBase, DataViewFieldBase } from '@kbn/es-query';
import { TimeUnitChar } from '@kbn/response-ops-rule-params/common/utils';
import { INDEX } from '../../../../common/es_fields';
import { useKibanaContextForPlugin } from '../../../utils';
import { RuleConditionChart } from './rule_condition_chart';

const degradedDocsLabel = i18n.translate('xpack.datasetQuality.rule.degradedDocsLabel', {
  defaultMessage: 'degraded docs',
});

export const defaultRuleParams: Partial<DegradedDocsRuleParams> = {
  comparator: COMPARATORS.GREATER_THAN,
  threshold: [3],
  timeSize: 5,
  timeUnit: 'm',
  groupBy: [INDEX],
};

export type DataStreamGroupByFields = Array<DataViewFieldBase & { aggregatable: boolean }>;

export const RuleForm: React.FunctionComponent<
  RuleTypeParamsExpressionProps<DegradedDocsRuleParams, { adHocDataViewList: DataView[] }>
> = (props) => {
  const {
    services: { dataViews, dataViewEditor },
  } = useKibanaContextForPlugin();

  const { setRuleParams, ruleParams, errors, metadata, onChangeMetaData } = props;
  const { searchConfiguration, comparator, threshold, timeSize, timeUnit, groupBy } = ruleParams;

  const [dataView, setDataView] = useState<DataView>();
  const [dataViewError, setDataViewError] = useState<string>();
  const [preselectedOptions, _] = useState<string[]>(defaultRuleParams.groupBy ?? []);
  const [adHocDataViews, setAdHocDataViews] = useState<DataView[]>(
    metadata?.adHocDataViewList ?? []
  );

  const preFillProperty = useCallback(
    (property: keyof DegradedDocsRuleParams) => {
      setRuleParams(property, defaultRuleParams[property]);
    },
    [setRuleParams]
  );

  const updateProperty = useCallback(
    (property: keyof DegradedDocsRuleParams, value?: any) => {
      setRuleParams(property, value);
    },
    [setRuleParams]
  );

  useEffect(() => {
    const initDataView = async () => {
      if (!searchConfiguration?.index) {
        setDataViewError(
          i18n.translate('xpack.datasetQuality.rule.dataViewErrorNoTimestamp', {
            defaultMessage: 'A data view is required.',
          })
        );
        return;
      }
      if (searchConfiguration?.index && !dataView) {
        const savedDataViews = await dataViews.getIdsWithTitle();
        const savedDataViewId = savedDataViews.find(
          (dv) => dv.title === searchConfiguration?.index
        )?.id;

        if (savedDataViewId) {
          setDataView(await dataViews.get(savedDataViewId));
          return;
        }

        let currentDataView: DataView;
        const adHocDataView = adHocDataViews.find((dv) => dv.title === searchConfiguration?.index);

        if (adHocDataView) {
          currentDataView = adHocDataView;
        } else {
          currentDataView = await dataViews.create({
            title: searchConfiguration?.index,
            timeFieldName: '@timestamp',
          });

          setAdHocDataViews((prev) => [...prev, currentDataView]);
        }

        setDataView(currentDataView);
      }
    };

    initDataView();
  }, [adHocDataViews, dataView, dataViews, searchConfiguration?.index]);

  useEffect(() => {
    if (!comparator) {
      preFillProperty('comparator');
    }

    if (!threshold) {
      preFillProperty('threshold');
    }

    if (!timeSize) {
      preFillProperty('timeSize');
    }

    if (!timeUnit) {
      preFillProperty('timeUnit');
    }

    if (!groupBy) {
      preFillProperty('groupBy');
    }
  }, [preFillProperty, comparator, groupBy, threshold, timeSize, timeUnit]);

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
      setDataViewError(undefined);
      updateProperty('searchConfiguration', { index: newDataView.getIndexPattern() });
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
            id="xpack.datasetQuality.rule.dataView"
            defaultMessage="Select a data view"
          />
        </h5>
      </EuiTitle>

      <EuiSpacer size="s" />

      <DataViewSelectPopover
        dependencies={{ dataViews, dataViewEditor }}
        dataView={dataView}
        metadata={{ adHocDataViewList: adHocDataViews }}
        onSelectDataView={onSelectDataView}
        onChangeMetaData={({ adHocDataViewList }) => {
          onChangeMetaData({ ...metadata, adHocDataViewList });
        }}
      />
      {dataViewError && (
        <>
          <EuiFormErrorText data-test-subj="datasetQualityRuleDataViewError">
            {dataViewError}
          </EuiFormErrorText>
          <EuiSpacer size="s" />
        </>
      )}

      <EuiSpacer size="m" />

      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.datasetQuality.rule.alertCondition"
            defaultMessage="Set rule conditions"
          />
        </h5>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiExpression
        data-test-subj="datasetQualityRuleCountExpression"
        description={'PERCENTAGE'}
        value={degradedDocsLabel}
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

      <RuleConditionChart
        threshold={threshold}
        comparator={comparator as COMPARATORS}
        timeSize={timeSize}
        timeUnit={timeUnit as TimeUnitChar}
        dataView={dataView}
        groupBy={groupBy}
        timeRange={{ from: `now-${(timeSize ?? 1) * 20}${timeUnit}`, to: 'now' }}
      />

      <EuiSpacer size="l" />

      <ForLastExpression
        timeWindowSize={timeSize}
        timeWindowUnit={timeUnit}
        errors={{
          timeSize: [],
          timeUnit: [],
        }}
        onChangeWindowSize={(value) => updateProperty('timeSize', value)}
        onChangeWindowUnit={(value) => updateProperty('timeUnit', value)}
        display="fullWidth"
      />

      <EuiSpacer size="l" />

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
