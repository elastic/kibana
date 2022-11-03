/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { ReactElement } from 'react';
import { calculateBounds } from '@kbn/data-plugin/common';
import { FieldFormatter, MIN_ZOOM, MAX_ZOOM } from '@kbn/maps-plugin/common';
import type {
  AbstractSourceDescriptor,
  Attribution,
  DataFilters,
  DataRequestMeta,
  Timeslice,
} from '@kbn/maps-plugin/common/descriptor_types';
import type {
  DataRequest,
  IField,
  ImmutableSourceProperty,
  IRasterSource,
  SourceEditorArgs,
} from '@kbn/maps-plugin/public';
import { RasterTileSourceData } from '@kbn/maps-plugin/public/classes/sources/raster_source';
import { RasterTileSource } from 'maplibre-gl';

type CustomRasterSourceDescriptor = AbstractSourceDescriptor;

export class CustomRasterSource implements IRasterSource {
  static type = 'CUSTOM_RASTER';

  readonly _descriptor: CustomRasterSourceDescriptor;

  static createDescriptor(): CustomRasterSourceDescriptor {
    return {
      type: CustomRasterSource.type,
    };
  }

  constructor(sourceDescriptor: CustomRasterSourceDescriptor) {
    this._descriptor = sourceDescriptor;
  }
  async hasLegendDetails(): Promise<boolean> {
    return true;
  }

  renderLegendDetails(): ReactElement<any> | null {
    return <img alt="Radar legend" src="https://nowcoast.noaa.gov/images/legends/radar.png" />;
  }
  async canSkipSourceUpdate(
    dataRequest: DataRequest,
    nextRequestMeta: DataRequestMeta
  ): Promise<boolean> {
    const prevMeta = dataRequest.getMeta();
    if (!prevMeta) {
      return Promise.resolve(false);
    }

    return Promise.resolve(_.isEqual(prevMeta.timeslice, nextRequestMeta.timeslice));
  }

  isSourceStale(mbSource: RasterTileSource, sourceData: RasterTileSourceData): boolean {
    if (!sourceData.url) {
      return false;
    }
    return mbSource.tiles?.[0] !== sourceData.url;
  }

  cloneDescriptor(): CustomRasterSourceDescriptor {
    return {
      type: this._descriptor.type,
    };
  }

  async supportsFitToBounds(): Promise<boolean> {
    return false;
  }

  /**
   * return list of immutable source properties.
   * Immutable source properties are properties that can not be edited by the user.
   */
  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
    return [];
  }

  getType(): string {
    return this._descriptor.type;
  }

  async getDisplayName(): Promise<string> {
    return '';
  }

  getAttributionProvider(): (() => Promise<Attribution[]>) | null {
    return null;
  }

  isFieldAware(): boolean {
    return false;
  }

  isGeoGridPrecisionAware(): boolean {
    return false;
  }

  isQueryAware(): boolean {
    return false;
  }

  getFieldNames(): string[] {
    return [];
  }

  renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs): ReactElement<any> | null {
    return null;
  }

  getApplyGlobalQuery(): boolean {
    return false;
  }

  getApplyGlobalTime(): boolean {
    return true;
  }

  getApplyForceRefresh(): boolean {
    return false;
  }

  getIndexPatternIds(): string[] {
    return [];
  }

  getQueryableIndexPatternIds(): string[] {
    return [];
  }

  getGeoGridPrecision(zoom: number): number {
    return 0;
  }

  isESSource(): boolean {
    return false;
  }

  // Returns function used to format value
  async createFieldFormatter(field: IField): Promise<FieldFormatter | null> {
    return null;
  }

  async getValueSuggestions(field: IField, query: string): Promise<string[]> {
    return [];
  }

  async isTimeAware(): Promise<boolean> {
    return true;
  }

  isFilterByMapBounds(): boolean {
    return false;
  }

  getMinZoom(): number {
    return MIN_ZOOM;
  }

  getMaxZoom(): number {
    return MAX_ZOOM;
  }

  async getLicensedFeatures(): Promise<[]> {
    return [];
  }

  getUpdateDueToTimeslice(prevMeta: DataRequestMeta, timeslice?: Timeslice): boolean {
    return true;
  }

  async getUrlTemplate(dataFilters: DataFilters): Promise<string> {
    const defaultUrl =
      'https://new.nowcoast.noaa.gov/arcgis/rest/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer/export?dpi=96&transparent=true&format=png32&time={time}&layers=show%3A3&bbox=-{bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256%2C256&f=image';

    const { timeslice, timeFilters } = dataFilters;
    let timestamp;

    if (timeslice) {
      // Use the value from the timeslider
      timestamp = new Date(timeslice.to).getTime();
    } else {
      const { max } = calculateBounds(timeFilters);
      timestamp = max ? max.valueOf() : Date.now();
    }

    // Replace the '{time}' template value in the URL with the Unix timestamp
    return defaultUrl.replace('{time}', timestamp.toString());
  }
}
