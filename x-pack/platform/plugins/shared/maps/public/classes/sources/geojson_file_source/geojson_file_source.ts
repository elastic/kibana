/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Feature, FeatureCollection } from 'geojson';
import { AbstractVectorSource, BoundsRequestMeta, GeoJsonWithMeta } from '../vector_source';
import { EMPTY_FEATURE_COLLECTION, FIELD_ORIGIN, SOURCE_TYPES } from '../../../../common/constants';
import {
  InlineFieldDescriptor,
  GeojsonFileSourceDescriptor,
  MapExtent,
} from '../../../../common/descriptor_types';
import { IField } from '../../fields/field';
import { getFeatureCollectionBounds } from '../../util/get_feature_collection_bounds';
import { InlineField } from '../../fields/inline_field';

function convertToFeatureCollection(
  geoJson: Feature | FeatureCollection | null | undefined
): FeatureCollection {
  if (!geoJson) {
    return EMPTY_FEATURE_COLLECTION;
  }

  if (geoJson.type === 'FeatureCollection') {
    return geoJson;
  }

  if (geoJson.type === 'Feature') {
    return {
      type: 'FeatureCollection',
      features: [geoJson],
    };
  }

  return EMPTY_FEATURE_COLLECTION;
}

export class GeoJsonFileSource extends AbstractVectorSource {
  static createDescriptor(
    descriptor: Partial<GeojsonFileSourceDescriptor>
  ): GeojsonFileSourceDescriptor {
    return {
      type: SOURCE_TYPES.GEOJSON_FILE,
      __featureCollection: convertToFeatureCollection(descriptor.__featureCollection),
      __fields: descriptor.__fields || [],
      areResultsTrimmed:
        descriptor.areResultsTrimmed !== undefined ? descriptor.areResultsTrimmed : false,
      tooltipContent: descriptor.tooltipContent ? descriptor.tooltipContent : null,
      name: descriptor.name || 'Features',
    };
  }

  constructor(descriptor: Partial<GeojsonFileSourceDescriptor>) {
    const normalizedDescriptor = GeoJsonFileSource.createDescriptor(descriptor);
    super(normalizedDescriptor);
  }

  private _getFieldDescriptors(): InlineFieldDescriptor[] {
    const fields = (this._descriptor as GeojsonFileSourceDescriptor).__fields;
    return fields ? fields : [];
  }

  private _createField(fieldDescriptor: InlineFieldDescriptor): IField {
    return new InlineField<GeoJsonFileSource>({
      fieldName: fieldDescriptor.name,
      source: this,
      origin: FIELD_ORIGIN.SOURCE,
      dataType: fieldDescriptor.type,
    });
  }

  async getFields(): Promise<IField[]> {
    return this._getFieldDescriptors().map((fieldDescriptor: InlineFieldDescriptor) => {
      return this._createField(fieldDescriptor);
    });
  }

  getFieldByName(fieldName: string): IField | null {
    const fieldDescriptor = this._getFieldDescriptors().find((findFieldDescriptor) => {
      return findFieldDescriptor.name === fieldName;
    });
    return fieldDescriptor ? this._createField(fieldDescriptor) : null;
  }

  isBoundsAware(): boolean {
    return true;
  }

  async getBoundsForFilters(
    boundsFilters: BoundsRequestMeta,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<MapExtent | null> {
    const featureCollection = this.getFeatureCollection();
    return getFeatureCollectionBounds(featureCollection, false);
  }

  async getGeoJsonWithMeta(): Promise<GeoJsonWithMeta> {
    return {
      data: this.getFeatureCollection(),
      meta: {},
    };
  }

  async getDisplayName() {
    return (this._descriptor as GeojsonFileSourceDescriptor).name;
  }

  hasTooltipProperties() {
    return true;
  }

  getSourceStatus() {
    return {
      tooltipContent: (this._descriptor as GeojsonFileSourceDescriptor).tooltipContent,
      areResultsTrimmed: (this._descriptor as GeojsonFileSourceDescriptor).areResultsTrimmed,
    };
  }

  getFeatureCollection() {
    return (this._descriptor as GeojsonFileSourceDescriptor).__featureCollection;
  }
}
