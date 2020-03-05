/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AbstractESSource } from './es_source';
import { ESAggMetricField } from '../fields/es_agg_field';
import { ESDocField } from '../fields/es_doc_field';
import {
  AGG_TYPE,
  COUNT_PROP_LABEL,
  COUNT_PROP_NAME,
  FIELD_ORIGIN,
} from '../../../common/constants';

export const AGG_DELIMITER = '_of_';

export class AbstractESAggSource extends AbstractESSource {
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

  getFieldByName(name) {
    return this.getMetricFieldForName(name);
  }

  createField() {
    throw new Error('Cannot create a new field from just a fieldname for an es_agg_source.');
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
          aggType: AGG_TYPE.COUNT,
          source: this,
          origin: this.getOriginForField(),
        })
      );
    }
    return metrics;
  }

  getAggKey(aggType, fieldName) {
    return aggType !== AGG_TYPE.COUNT ? `${aggType}${AGG_DELIMITER}${fieldName}` : COUNT_PROP_NAME;
  }

  getAggLabel(aggType, fieldName) {
    switch (aggType) {
      case AGG_TYPE.COUNT:
        return COUNT_PROP_LABEL;
      case AGG_TYPE.TERMS:
        return i18n.translate('xpack.maps.source.esAggSource.topTermLabel', {
          defaultMessage: `Top {fieldName}`,
          values: { fieldName },
        });
      default:
        return `${aggType} ${fieldName}`;
    }
  }

  getValueAggsDsl(indexPattern) {
    const valueAggsDsl = {};
    this.getMetricFields()
      .filter(esAggMetric => {
        return esAggMetric.getAggType() !== AGG_TYPE.COUNT;
      })
      .forEach(esAggMetric => {
        valueAggsDsl[esAggMetric.getName()] = esAggMetric.getValueAggDsl(indexPattern);
      });
    return valueAggsDsl;
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
