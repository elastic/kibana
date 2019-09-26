/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonIcon, EuiButtonEmpty, EuiPanel, EuiSpacer, EuiTextAlign } from '@elastic/eui';
import { MetricEditor } from './metric_editor';

export function MetricsEditor({ fields, metrics, onChange, allowMultipleMetrics, metricsFilter }) {
  function renderMetrics() {
    return metrics.map((metric, index) => {
      const onMetricChange = metric => {
        onChange([...metrics.slice(0, index), metric, ...metrics.slice(index + 1)]);
      };

      const onRemove = () => {
        onChange([...metrics.slice(0, index), ...metrics.slice(index + 1)]);
      };

      let removeButton;
      if (index > 0) {
        removeButton = (
          <EuiButtonIcon
            iconType="trash"
            size="s"
            iconSize="s"
            color="danger"
            aria-label={i18n.translate('xpack.maps.metricsEditor.deleteMetricAriaLabel', {
              defaultMessage: 'Delete metric',
            })}
            title={i18n.translate('xpack.maps.metricsEditor.deleteMetricButtonLabel', {
              defaultMessage: 'Delete metric',
            })}
            onClick={onRemove}
          />
        );
      }
      return (
        <EuiPanel key={index} className="mapMetricEditorPanel" paddingSize="s">
          <MetricEditor
            onChange={onMetricChange}
            metric={metric}
            fields={fields}
            metricsFilter={metricsFilter}
            removeButton={removeButton}
          />
        </EuiPanel>
      );
    });
  }

  function addMetric() {
    onChange([...metrics, {}]);
  }

  function renderAddMetricButton() {
    if (!allowMultipleMetrics) {
      return null;
    }

    return (
      <>
        <EuiSpacer size="xs" />
        <EuiTextAlign textAlign="center">
          <EuiButtonEmpty onClick={addMetric} size="xs" iconType="plusInCircleFilled">
            <FormattedMessage
              id="xpack.maps.metricsEditor.addMetricButtonLabel"
              defaultMessage="Add metric"
            />
          </EuiButtonEmpty>
        </EuiTextAlign>
      </>
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
  metrics: PropTypes.array,
  fields: PropTypes.object, // indexPattern.fields IndexedArray object
  onChange: PropTypes.func.isRequired,
  allowMultipleMetrics: PropTypes.bool,
  metricsFilter: PropTypes.func,
};

MetricsEditor.defaultProps = {
  metrics: [{ type: 'count' }],
  allowMultipleMetrics: true,
};
