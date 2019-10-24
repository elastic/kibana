/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { AbstractESSource } from './es_source';
import _ from 'lodash';
import { ESAggMetricTooltipProperty } from '../tooltips/es_aggmetric_tooltip_property';

export class AbstractESAggSource extends AbstractESSource {

  constructor(descriptor, inspectorAdapters) {
    super(descriptor, inspectorAdapters);
    this._metricFields = [];
  }

  _getValidMetrics() {
    const metrics = _.get(this._descriptor, 'metrics', []).filter(({ type, field }) => {
      return (type === 'count')  ? true : !!field;
    });
    if (metrics.length === 0) {
      metrics.push({ type: 'count' });
    }
    return metrics;
  }

  _formatMetricKey() {
    throw new Error('should implement');
  }

  _formatMetricLabel() {
    throw new Error('should implement');
  }

  getMetricFields() {
    return this._getValidMetrics().map(metric => {
      const metricKey = this._formatMetricKey(metric);
      const metricLabel = metric.label ? metric.label : this._formatMetricLabel(metric);
      const metricCopy = { ...metric };
      delete metricCopy.label;
      return {
        ...metricCopy,
        propertyKey: metricKey,
        propertyLabel: metricLabel
      };
    });
  }

  async filterAndFormatPropertiesToHtmlForMetricFields(properties) {
    let indexPattern;
    try {
      indexPattern = await this.getIndexPattern();
    } catch(error) {
      console.warn(`Unable to find Index pattern ${this._descriptor.indexPatternId}, values are not formatted`);
      return properties;
    }


    const metricFields = this.getMetricFields();
    const tooltipProperties = [];
    metricFields.forEach((metricField) => {
      let value;
      for (const key in properties) {
        if (properties.hasOwnProperty(key) && metricField.propertyKey === key) {
          value = properties[key];
          break;
        }
      }

      const tooltipProperty  = new ESAggMetricTooltipProperty(
        metricField.propertyKey,
        metricField.propertyLabel,
        value,
        indexPattern,
        metricField
      );
      tooltipProperties.push(tooltipProperty);
    });

    return tooltipProperties;

  }
}
