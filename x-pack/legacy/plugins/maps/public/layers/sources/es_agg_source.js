/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { AbstractESSource } from './es_source';
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
      const esDocField = metric.field ? new ESDocField({ fieldName: metric.field }) : null;
      return new ESAggMetricField({
        label: metric.label,
        esDocField: esDocField,
        aggType: metric.type,
        source: this
      });
    }) : [];
  }

  getMetricFieldForName(fieldName) {
    return this._metricFields.find(metricField => {
      return metricField.getName() === fieldName;
    });
  }

  getMetricFields() {
    const metrics = this._metricFields.filter(esAggField => {
      return (esAggField.getAggType() === 'count')  ? true : !!esAggField.getESDocField();
    });
    if (metrics.length === 0) {
      metrics.push(new ESAggMetricField({
        aggType: 'count',
        source: this
      }));
    }
    return metrics;
  }

  formatMetricKey(type, fieldName) {
    return type !== 'count' ? `${type}_of_${fieldName}` : COUNT_PROP_NAME;
  }

  formatMetricLabel(type, fieldName) {
    return type !== 'count' ? `${type} of ${fieldName}` : COUNT_PROP_LABEL;
  }

  createMetricAggConfigs() {
    return this.getMetricFields().map(esAggMetric => esAggMetric.makeMetricAggConfig());
  }


  async getNumberFields() {
    return this.getMetricFields().map(esAggMetricField => {
      return { label: esAggMetricField.getPropertyLabel(), name: esAggMetricField.getName() };
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
        if (properties.hasOwnProperty(key) && metricField.getName() === key) {
          value = properties[key];
          break;
        }
      }

      const tooltipProperty  = new ESAggMetricTooltipProperty(
        metricField.getName(),
        metricField.getPropertyLabel(),
        value,
        indexPattern,
        metricField
      );
      tooltipProperties.push(tooltipProperty);
    });

    return tooltipProperties;

  }
}
