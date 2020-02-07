/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { copyPersistentState } from '../../reducers/util';

export class AbstractSource {
  static isIndexingSource = false;

  static renderEditor() {
    throw new Error('Must implement Source.renderEditor');
  }

  static createDescriptor() {
    throw new Error('Must implement Source.createDescriptor');
  }

  constructor(descriptor, inspectorAdapters) {
    this._descriptor = descriptor;
    this._inspectorAdapters = inspectorAdapters;
  }

  destroy() {}

  cloneDescriptor() {
    return copyPersistentState(this._descriptor);
  }

  async supportsFitToBounds() {
    return true;
  }

  /**
   * return list of immutable source properties.
   * Immutable source properties are properties that can not be edited by the user.
   */
  async getImmutableProperties() {
    return [];
  }

  getInspectorAdapters() {
    return this._inspectorAdapters;
  }

  _createDefaultLayerDescriptor() {
    throw new Error(`Source#createDefaultLayerDescriptor not implemented`);
  }

  createDefaultLayer() {
    throw new Error(`Source#createDefaultLayer not implemented`);
  }

  async getDisplayName() {
    console.warn('Source should implement Source#getDisplayName');
    return '';
  }

  /**
   * return attribution for this layer as array of objects with url and label property.
   * e.g. [{ url: 'example.com', label: 'foobar' }]
   * @return {Promise<null>}
   */
  async getAttributions() {
    return [];
  }

  isFieldAware() {
    return false;
  }

  isRefreshTimerAware() {
    return false;
  }

  isGeoGridPrecisionAware() {
    return false;
  }

  isQueryAware() {
    return false;
  }

  getFieldNames() {
    return [];
  }

  hasCompleteConfig() {
    throw new Error(`Source#hasCompleteConfig not implemented`);
  }

  renderSourceSettingsEditor() {
    return null;
  }

  getApplyGlobalQuery() {
    return !!this._descriptor.applyGlobalQuery;
  }

  getIndexPatternIds() {
    return [];
  }

  getQueryableIndexPatternIds() {
    return [];
  }

  getGeoGridPrecision() {
    return 0;
  }

  getSyncMeta() {
    return {};
  }

  isJoinable() {
    return false;
  }

  shouldBeIndexed() {
    return AbstractSource.isIndexingSource;
  }

  isESSource() {
    return false;
  }

  // Returns geo_shape indexed_shape context for spatial quering by pre-indexed shapes
  async getPreIndexedShape(/* properties */) {
    return null;
  }

  // Returns function used to format value
  async getFieldFormatter(/* fieldName */) {
    return null;
  }

  async loadStylePropsMeta() {
    throw new Error(`Source#loadStylePropsMeta not implemented`);
  }
}
