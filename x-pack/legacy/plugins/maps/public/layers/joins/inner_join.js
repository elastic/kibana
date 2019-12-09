/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { ESTermSource } from '../sources/es_term_source';
import { getComputedFieldNamePrefix } from '../styles/vector/style_util';
import { META_ID_ORIGIN_SUFFIX } from '../../../common/constants';

export class InnerJoin {

  constructor(joinDescriptor, leftSource) {
    this._descriptor = joinDescriptor;
    const inspectorAdapters = leftSource.getInspectorAdapters();
    this._rightSource = new ESTermSource(joinDescriptor.right, inspectorAdapters);
    this._leftField = this._descriptor.leftField ? leftSource.createField({ fieldName: joinDescriptor.leftField }) : null;
  }

  destroy() {
    this._rightSource.destroy();
  }

  hasCompleteConfig() {
    if (this._leftField && this._rightSource) {
      return this._rightSource.hasCompleteConfig();
    }

    return false;
  }

  getJoinFields() {
    return this._rightSource.getMetricFields();
  }

  // Source request id must be static and unique because the re-fetch logic uses the id to locate the previous request.
  // Elasticsearch sources have a static and unique id so that requests can be modified in the inspector.
  // Using the right source id as the source request id because it meets the above criteria.
  getSourceDataRequestId() {
    return `join_source_${this._rightSource.getId()}`;
  }

  getSourceMetaDataRequestId() {
    return `${this.getSourceDataRequestId()}_${META_ID_ORIGIN_SUFFIX}`;
  }

  getLeftField() {
    return this._leftField;
  }

  joinPropertiesToFeature(feature, propertiesMap) {
    const rightMetricFields = this._rightSource.getMetricFields();
    // delete feature properties added by previous join
    for (let j = 0; j < rightMetricFields.length; j++) {
      const metricPropertyKey  = rightMetricFields[j].getName();
      delete feature.properties[metricPropertyKey];

      // delete all dynamic properties for metric field
      const stylePropertyPrefix = getComputedFieldNamePrefix(metricPropertyKey);
      Object.keys(feature.properties).forEach(featurePropertyKey => {
        if (featurePropertyKey.length >= stylePropertyPrefix.length &&
          featurePropertyKey.substring(0, stylePropertyPrefix.length) === stylePropertyPrefix) {
          delete feature.properties[featurePropertyKey];
        }
      });
    }

    const joinKey = feature.properties[this._leftField.getName()];
    const coercedKey = typeof joinKey === 'undefined' || joinKey === null  ? null : joinKey.toString();
    if (propertiesMap && coercedKey !== null && propertiesMap.has(coercedKey)) {
      Object.assign(feature.properties,  propertiesMap.get(coercedKey));
      return true;
    } else {
      return false;
    }
  }

  getRightJoinSource() {
    return this._rightSource;
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

  getQueryableIndexPatternIds() {
    return  this._rightSource.getQueryableIndexPatternIds();
  }

  getWhereQuery() {
    return this._rightSource.getWhereQuery();
  }
}

