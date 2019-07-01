/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { ESJoinSource } from '../sources/es_join_source';
import { VectorStyle } from '../styles/vector_style';

export class LeftInnerJoin {

  static toHash(descriptor) {
    return JSON.stringify(descriptor);
  }

  constructor(joinDescriptor, inspectorAdapters) {
    this._descriptor = joinDescriptor;
    this._rightSource = new ESJoinSource(joinDescriptor.right, inspectorAdapters);
  }

  destroy() {
    this._rightSource.destroy();
  }

  hasCompleteConfig() {
    if (this._descriptor.leftField && this._rightSource) {
      return this._rightSource.hasCompleteConfig();
    }

    return false;
  }

  getRightMetricFields() {
    return this._rightSource.getMetricFields();
  }

  getJoinFields() {
    return this.getRightMetricFields().map(({ propertyKey: name, propertyLabel: label }) => {
      return { label, name };
    });
  }

  getSourceId() {
    return LeftInnerJoin.toHash(this._descriptor);
  }

  getLeftFieldName() {
    return this._descriptor.leftField;
  }

  canJoin(feature, propertiesMap) {
    const joinKey = feature.properties[this._descriptor.leftField];
    return propertiesMap && propertiesMap.has(joinKey);
  }

  joinPropertiesToFeature(feature, propertiesMap, rightMetricFields) {
    for (let j = 0; j < rightMetricFields.length; j++) {
      const { propertyKey } = rightMetricFields[j];
      delete feature.properties[propertyKey];
      const stylePropertyName = VectorStyle.getComputedFieldName(propertyKey);
      delete feature.properties[stylePropertyName];
    }
    const joinKey = feature.properties[this._descriptor.leftField];
    if (propertiesMap && propertiesMap.has(joinKey)) {
      Object.assign(feature.properties,  propertiesMap.get(joinKey));
      return true;
    }else {
      return false;
    }
  }

  getRightJoinSource() {
    return this._rightSource;
  }

  getId() {
    return this._descriptor.id;
  }

  toDescriptor() {
    return this._descriptor;
  }

  async filterAndFormatPropertiesForTooltip(properties) {
    return await this._rightSource.filterAndFormatPropertiesToHtml(properties);
  }

  getIndexPatternIds() {
    return  this._rightSource.getIndexPatternIds();
  }

  getWhereQuery() {
    return this._rightSource.getWhereQuery();
  }
}

