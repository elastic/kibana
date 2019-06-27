/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButtonIcon,
  EuiButton,
  EuiPanel,
} from '@elastic/eui';

import { METRIC_AGGREGATION_VALUES } from './metric_select';
import { MetricEditor } from './metric_editor';

export function MetricsEditor({ fields, metrics, onChange, allowMultipleMetrics, metricsFilter }) {

  function onMetricChange(metric, index) {
    onChange([
      ...metrics.slice(0, index),
      metric,
      ...metrics.slice(index + 1)
    ]);
  }

  function renderMetrics() {
    return metrics.map((metric, index) => {
      const onChange = (metric) => {
        onMetricChange(metric, index);
      };

      const onRemove = () => {
        onChange([
          ...metrics.slice(0, index),
          ...metrics.slice(index + 1)
        ]);
      };

      let removeButton;
      if (index > 0) {
        removeButton = (
          <EuiButtonIcon
            className="mapMetricEditorRemoveButton"
            iconType="trash"
            color="danger"
            aria-label={i18n.translate('xpack.maps.metricsEditor.deleteMetricAriaLabel', {
              defaultMessage: 'Delete metric'
            })}
            title={i18n.translate('xpack.maps.metricsEditor.deleteMetricButtonLabel', {
              defaultMessage: 'Delete metric'
            })}
            onClick={onRemove}
          />
        );
      }
      return (
        <EuiPanel
          key={index}
          className="mapMetricEditorPanel"
          paddingSize="s"
        >
          <MetricEditor
            onChange={onChange}
            metric={metric}
            fields={fields}
            metricsFilter={metricsFilter}
          />
          {removeButton}
        </EuiPanel>
      );
    });
  }

  function addMetric() {
    onChange([
      ...metrics,
      {},
    ]);
  }

  function renderAddMetricButton() {

    if (!allowMultipleMetrics) {
      return null;
    }

    return (
      <EuiButton
        onClick={addMetric}
        style={{ topMargin: '4px' }}
      >
        <FormattedMessage
          id="xpack.maps.metricsEditor.addMetricButtonLabel"
          defaultMessage="Add metric"
        />
      </EuiButton>
    );
  }


  return (
    <Fragment>
      {renderMetrics()}

      {renderAddMetricButton()}
    </Fragment>
  );
}

MetricsEditor.propTypes = {
  metrics: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.oneOf(METRIC_AGGREGATION_VALUES),
    field: PropTypes.string,
  })),
  fields: PropTypes.object,  // indexPattern.fields IndexedArray object
  onChange: PropTypes.func.isRequired,
  allowMultipleMetrics: PropTypes.bool,
  metricsFilter: PropTypes.func,
};

MetricsEditor.defaultProps = {
  metrics: [
    { type: 'count' }
  ],
  allowMultipleMetrics: true
};
