/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESTermSource } from '../sources/es_term_source';
import { VectorStyle } from '../styles/vector_style';

export class InnerJoin {
  constructor(joinDescriptor, inspectorAdapters) {
    this._descriptor = joinDescriptor;
    this._rightSource = new ESTermSource(joinDescriptor.right, inspectorAdapters);
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

  // Source request id must be static and unique because the re-fetch logic uses the id to locate the previous request.
  // Elasticsearch sources have a static and unique id so that requests can be modified in the inspector.
  // Using the right source id as the source request id because it meets the above criteria.
  getSourceId() {
    return `join_source_${this._rightSource.getId()}`;
  }

  getLeftFieldName() {
    return this._descriptor.leftField;
  }

  joinPropertiesToFeature(feature, propertiesMap, rightMetricFields) {
    // delete feature properties added by previous join
    for (let j = 0; j < rightMetricFields.length; j++) {
      const { propertyKey: metricPropertyKey } = rightMetricFields[j];
      delete feature.properties[metricPropertyKey];

      // delete all dynamic properties for metric field
      const stylePropertyPrefix = VectorStyle.getComputedFieldNamePrefix(metricPropertyKey);
      Object.keys(feature.properties).forEach(featurePropertyKey => {
        if (
          featurePropertyKey.length >= stylePropertyPrefix.length &&
          featurePropertyKey.substring(0, stylePropertyPrefix.length) === stylePropertyPrefix
        ) {
          delete feature.properties[featurePropertyKey];
        }
      });
    }

    const joinKey = feature.properties[this._descriptor.leftField];
    const coercedKey =
      typeof joinKey === 'undefined' || joinKey === null ? null : joinKey.toString();
    if (propertiesMap && coercedKey !== null && propertiesMap.has(coercedKey)) {
      Object.assign(feature.properties, propertiesMap.get(coercedKey));
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
    return this._rightSource.getIndexPatternIds();
  }

  getWhereQuery() {
    return this._rightSource.getWhereQuery();
  }
}
