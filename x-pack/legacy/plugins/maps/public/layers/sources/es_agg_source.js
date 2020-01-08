/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractESSource } from './es_source';
import { ESAggMetricField } from '../fields/es_agg_field';
import { ESDocField } from '../fields/es_doc_field';
import {
  METRIC_TYPE,
  COUNT_AGG_TYPE,
  COUNT_PROP_LABEL,
  COUNT_PROP_NAME,
  FIELD_ORIGIN,
} from '../../../common/constants';

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
      METRIC_TYPE.UNIQUE_COUNT,
    ],
    defaults: [{ schema: 'metric', type: METRIC_TYPE.COUNT }],
  };

  constructor(descriptor, inspectorAdapters) {
    super(descriptor, inspectorAdapters);
    this._metricFields = this._descriptor.metrics
      ? this._descriptor.metrics.map(metric => {
          const esDocField = metric.field
            ? new ESDocField({ fieldName: metric.field, source: this })
            : null;
          return new ESAggMetricField({
            label: metric.label,
            esDocField: esDocField,
            aggType: metric.type,
            source: this,
            origin: this.getOriginForField(),
          });
        })
      : [];
  }

  createField({ fieldName, label }) {
    //if there is a corresponding field with a custom label, use that one.
    if (!label) {
      const matchField = this._metricFields.find(field => field.getName() === fieldName);
      if (matchField) {
        label = matchField.getLabel();
      }
    }

    if (fieldName === COUNT_PROP_NAME) {
      return new ESAggMetricField({
        aggType: COUNT_AGG_TYPE,
        label: label,
        source: this,
        origin: this.getOriginForField(),
      });
    }
    //this only works because aggType is a fixed set and does not include the `_of_` string
    const [aggType, docField] = fieldName.split(AGG_DELIMITER);
    const esDocField = new ESDocField({ fieldName: docField, source: this });
    return new ESAggMetricField({
      label: label,
      esDocField,
      aggType,
      source: this,
      origin: this.getOriginForField(),
    });
  }

  hasMatchingMetricField(fieldName) {
    const matchingField = this.getMetricFieldForName(fieldName);
    return !!matchingField;
  }

  getMetricFieldForName(fieldName) {
    return this.getMetricFields().find(metricField => {
      return metricField.getName() === fieldName;
    });
  }

  getOriginForField() {
    return FIELD_ORIGIN.SOURCE;
  }

  getMetricFields() {
    const metrics = this._metricFields.filter(esAggField => esAggField.isValid());
    if (metrics.length === 0) {
      metrics.push(
        new ESAggMetricField({
          aggType: COUNT_AGG_TYPE,
          source: this,
          origin: this.getOriginForField(),
        })
      );
    }
    return metrics;
  }

  formatMetricKey(aggType, fieldName) {
    return aggType !== COUNT_AGG_TYPE ? `${aggType}${AGG_DELIMITER}${fieldName}` : COUNT_PROP_NAME;
  }

  formatMetricLabel(aggType, fieldName) {
    return aggType !== COUNT_AGG_TYPE ? `${aggType} of ${fieldName}` : COUNT_PROP_LABEL;
  }

  createMetricAggConfigs() {
    return this.getMetricFields().map(esAggMetric => esAggMetric.makeMetricAggConfig());
  }

  async getNumberFields() {
    return this.getMetricFields();
  }

  async filterAndFormatPropertiesToHtmlForMetricFields(properties) {
    const metricFields = this.getMetricFields();
    const tooltipPropertiesPromises = [];
    metricFields.forEach(metricField => {
      let value;
      for (const key in properties) {
        if (properties.hasOwnProperty(key) && metricField.getName() === key) {
          value = properties[key];
          break;
        }
      }

      const tooltipPromise = metricField.createTooltipProperty(value);
      tooltipPropertiesPromises.push(tooltipPromise);
    });

    return await Promise.all(tooltipPropertiesPromises);
  }
}
