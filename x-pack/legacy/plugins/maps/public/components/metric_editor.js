/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';

import { EuiFieldText, EuiFormRow } from '@elastic/eui';

import { MetricSelect, METRIC_AGGREGATION_VALUES } from './metric_select';
import { SingleFieldSelect } from './single_field_select';

export function MetricEditor({ fields, metricsFilter, metric, onChange, removeButton }) {
  const onAggChange = metricAggregationType => {
    onChange({
      ...metric,
      type: metricAggregationType,
    });
  };
  const onFieldChange = fieldName => {
    onChange({
      ...metric,
      field: fieldName,
    });
  };
  const onLabelChange = e => {
    onChange({
      ...metric,
      label: e.target.value,
    });
  };

  let fieldSelect;
  if (metric.type && metric.type !== 'count') {
    const filterNumberFields = field => {
      return field.type === 'number';
    };
    fieldSelect = (
      <EuiFormRow
        label={i18n.translate('xpack.maps.metricsEditor.selectFieldLabel', {
          defaultMessage: 'Field',
        })}
        display="columnCompressed"
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.maps.metricsEditor.selectFieldPlaceholder', {
            defaultMessage: 'Select field',
          })}
          value={metric.field}
          onChange={onFieldChange}
          filterField={filterNumberFields}
          fields={fields}
          isClearable={false}
          compressed
        />
      </EuiFormRow>
    );
  }

  let labelInput;
  if (metric.type) {
    labelInput = (
      <EuiFormRow
        label={i18n.translate('xpack.maps.metricsEditor.customLabel', {
          defaultMessage: 'Custom label',
        })}
        display="columnCompressed"
      >
        <EuiFieldText
          onChange={onLabelChange}
          value={metric.label ? metric.label : ''}
          compressed
        />
      </EuiFormRow>
    );
  }

  return (
    <Fragment>
      <EuiFormRow
        label={i18n.translate('xpack.maps.metricsEditor.aggregationLabel', {
          defaultMessage: 'Aggregation',
        })}
        display="columnCompressed"
      >
        <MetricSelect
          onChange={onAggChange}
          value={metric.type}
          metricsFilter={metricsFilter}
          compressed
        />
      </EuiFormRow>

      {fieldSelect}
      {labelInput}
      {removeButton}
    </Fragment>
  );
}

MetricEditor.propTypes = {
  metric: PropTypes.shape({
    type: PropTypes.oneOf(METRIC_AGGREGATION_VALUES),
    field: PropTypes.string,
    label: PropTypes.string,
  }),
  fields: PropTypes.object, // indexPattern.fields IndexedArray object
  onChange: PropTypes.func.isRequired,
  metricsFilter: PropTypes.func,
};
