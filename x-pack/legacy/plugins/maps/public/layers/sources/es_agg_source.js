/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { AbstractESSource } from './es_source';
import _ from 'lodash';
import { ESAggMetricTooltipProperty } from '../tooltips/es_aggmetric_tooltip_property';
import { ESAggMetricField } from '../fields/es_agg_field';
import { ESDocField } from '../fields/es_doc_field';

const COUNT_PROP_LABEL = 'count';
const COUNT_PROP_NAME = 'doc_count';

export class AbstractESAggSource extends AbstractESSource {

  static COUNT_PROP_LABEL = COUNT_PROP_LABEL;
  static COUNT_PROP_NANE = COUNT_PROP_NAME;

  constructor(descriptor, inspectorAdapters) {
    super(descriptor, inspectorAdapters);
    this._metricFields = this._descriptor.metrics ? this._descriptor.metrics.map(metric => {
      const esDocField = new ESDocField({ fieldName: metric.field });
      return new ESAggMetricField({
        label: metric.label,
        esDocField: esDocField,
        aggType: metric.type,
        source: this
      });
    }) : [];
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

  formatMetricKey(type, fieldName) {
    return type !== 'count' ? `${type}_of_${fieldName}` : COUNT_PROP_NAME;
  }

  formatMetricLabel(type, fieldName) {
    return type !== 'count' ? `${type} of ${fieldName}` : COUNT_PROP_LABEL;
  }

  getMetricFields() {
    return this._getValidMetrics().map(metric => {
      const metricKey = this.formatMetricKey(metric.type, metric.field);
      const metricLabel = metric.label ? metric.label : this.formatMetricLabel(metric.type, metric.field);
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
