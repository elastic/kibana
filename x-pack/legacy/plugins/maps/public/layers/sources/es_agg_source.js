/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractESSource } from './es_source';
import { ESAggMetricTooltipProperty } from '../tooltips/es_aggmetric_tooltip_property';
import { METRIC_TYPE } from '../../../common/constants';
import _ from 'lodash';

const COUNT_PROP_LABEL = 'count';
const COUNT_PROP_NAME = 'doc_count';
const AGG_DELIMITER = '_of_';

export class AbstractESAggSource extends AbstractESSource {

  static METRIC_SCHEMA_CONFIG = {
    group: 'metrics',
    name: 'metric',
    title: 'Value',
    min: 1,
    max: Infinity,
    aggFilter: [
      METRIC_TYPE.AVG,
      METRIC_TYPE.COUNT,
      METRIC_TYPE.MAX,
      METRIC_TYPE.MIN,
      METRIC_TYPE.SUM,
      METRIC_TYPE.UNIQUE_COUNT
    ],
    defaults: [
      { schema: 'metric', type: METRIC_TYPE.COUNT }
    ]
  };

  _formatMetricKey(metric) {
    const aggType = metric.type;
    const fieldName = metric.field;
    return aggType !== METRIC_TYPE.COUNT ? `${aggType}${AGG_DELIMITER}${fieldName}` : COUNT_PROP_NAME;
  }

  _formatMetricLabel(metric) {
    const aggType = metric.type;
    const fieldName = metric.field;
    return aggType !== METRIC_TYPE.COUNT ? `${aggType} of ${fieldName}` : COUNT_PROP_LABEL;
  }

  _getValidMetrics() {
    const metrics = _.get(this._descriptor, 'metrics', []).filter(({ type, field }) => {
      if (type === METRIC_TYPE.COUNT) {
        return true;
      }

      if (field) {
        return true;
      }
      return false;
    });
    if (metrics.length === 0) {
      metrics.push({ type: METRIC_TYPE.COUNT });
    }
    return metrics;
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

  async getNumberFields() {
    return this.getMetricFields().map(({ propertyKey: name, propertyLabel: label }) => {
      return { label, name };
    });
  }

  getFieldNames() {
    return this.getMetricFields().map(({ propertyKey }) => {
      return propertyKey;
    });
  }

  createMetricAggConfigs() {
    return this.getMetricFields().map(metric => {
      const metricAggConfig = {
        id: metric.propertyKey,
        enabled: true,
        type: metric.type,
        schema: 'metric',
        params: {}
      };
      if (metric.type !== METRIC_TYPE.COUNT) {
        metricAggConfig.params = { field: metric.field };
      }
      return metricAggConfig;
    });
  }

  async filterAndFormatPropertiesToHtmlForMetricFields(properties) {
    let indexPattern;
    try {
      indexPattern = await this._getIndexPattern();
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
