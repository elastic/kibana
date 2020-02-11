/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback } from 'react';
import uuid from 'uuid';
import {
  EuiForm,
  EuiButton,
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';
import { IFieldType } from 'src/plugins/data/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  SnapshotCustomAggregation,
  SnapshotCustomMetricInput,
  SNAPSHOT_CUSTOM_AGGREGATIONS,
  SnapshotCustomAggregationRT,
} from '../../../common/http_api/snapshot_api';

interface Props {
  fields: IFieldType[];
  customMetrics: SnapshotCustomMetricInput[];
  onChange: (metric: SnapshotCustomMetricInput) => void;
}

interface SelectedOption {
  label: string;
}

const AGGREGATION_LABELS = {
  ['avg']: i18n.translate('xpack.infra.waffle.customMetrics.aggregationLables.avg', {
    defaultMessage: 'Average',
  }),
  ['max']: i18n.translate('xpack.infra.waffle.customMetrics.aggregationLables.max', {
    defaultMessage: 'Max',
  }),
  ['min']: i18n.translate('xpack.infra.waffle.customMetrics.aggregationLables.min', {
    defaultMessage: 'Min',
  }),
  ['rate']: i18n.translate('xpack.infra.waffle.customMetrics.aggregationLables.rate', {
    defaultMessage: 'Rate',
  }),
};

export const CustomMetricForm = ({ fields, onChange, customMetrics }: Props) => {
  const [label, setLabel] = useState<string | undefined>();
  const [aggregation, setAggregation] = useState<SnapshotCustomAggregation>('avg');
  const [field, setField] = useState<SelectedOption[]>([]);

  const handleSubmit = useCallback(() => {
    if (aggregation && field[0]) {
      const newMetric: SnapshotCustomMetricInput = {
        type: 'custom',
        id: uuid.v1(),
        label,
        aggregation,
        field: field[0].label,
      };
      onChange(newMetric);
    }
  }, [label, aggregation, field, onChange]);

  const handleLabelChange = useCallback(
    e => {
      setLabel(e.target.value);
    },
    [setLabel]
  );

  const handleFieldChange = useCallback(
    (selectedOptions: SelectedOption[]) => {
      setField(selectedOptions);
    },
    [setField]
  );

  const handleAggregationChange = useCallback(
    e => {
      const value = e.target.value;
      const aggValue: SnapshotCustomAggregation = SnapshotCustomAggregationRT.is(value)
        ? value
        : 'avg';
      setAggregation(aggValue);
    },
    [setAggregation]
  );

  const fieldOptions = fields
    .filter(
      f => f.aggregatable && f.type === 'number' && !(field && field.some(o => o.label === f.name))
    )
    .map(f => ({ label: f.name }));

  const aggregationOptions = SNAPSHOT_CUSTOM_AGGREGATIONS.map(k => ({
    text: AGGREGATION_LABELS[k as SnapshotCustomAggregation],
    value: k,
  }));

  const isSubmitDisabled = !field.length || !aggregation;

  return (
    <EuiForm>
      <div style={{ padding: 16 }}>
        <EuiFormRow
          label={i18n.translate('xpack.waffle.customMetrics.labelLabel', {
            defaultMessage: 'Label (optional)',
          })}
          display="rowCompressed"
          fullWidth
        >
          <EuiFieldText
            name="label"
            placeholder={i18n.translate('xpack.waffle.customMetrics.labelPlaceholder', {
              defaultMessage: 'Choose a name to appear in the "Metric" dropdown',
            })}
            compressed
            fullWidth
            onChange={handleLabelChange}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.waffle.customMetrics.metricLabel', {
            defaultMessage: 'Metric',
          })}
          display="rowCompressed"
          fullWidth
        >
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiSelect
                onChange={handleAggregationChange}
                value={aggregation}
                options={aggregationOptions}
                fullWidth
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued">
                <span>of</span>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiComboBox
                fullWidth
                placeholder={i18n.translate('xpack.infra.waffle.customMetrics.fieldPlaceholder', {
                  defaultMessage: 'Select a field',
                })}
                singleSelection={{ asPlainText: true }}
                selectedOptions={field}
                options={fieldOptions}
                onChange={handleFieldChange}
                isClearable={false}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </div>
      <EuiHorizontalRule margin="xs" />
      <div style={{ padding: '8px 16px 16px', textAlign: 'right' }}>
        <EuiButton type="submit" size="s" fill onClick={handleSubmit} disabled={isSubmitDisabled}>
          <FormattedMessage
            id="xpack.infra.waffle.customMetrics.submitLabel"
            defaultMessage="Save"
          />
        </EuiButton>
      </div>
    </EuiForm>
  );
};
