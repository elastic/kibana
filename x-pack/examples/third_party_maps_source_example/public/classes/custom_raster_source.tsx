/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactElement } from 'react';
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
  IField,
  ImmutableSourceProperty,
  ITMSSource,
  SourceEditorArgs,
} from '@kbn/maps-plugin/public';

export interface CustomRasterSourceConfig {
  urlTemplate: string;
  isTimeAware?: boolean;
}

type CustomRasterSourceDescriptor = AbstractSourceDescriptor & {
  urlTemplate: string;
  isTimeAware: boolean;
};

export class CustomRasterSource implements ITMSSource {
  static type = 'CUSTOM_RASTER';

  readonly _descriptor: CustomRasterSourceDescriptor;

  static createDescriptor({
    urlTemplate,
    isTimeAware,
  }: CustomRasterSourceConfig): CustomRasterSourceDescriptor {
    return {
      type: CustomRasterSource.type,
      urlTemplate,
      isTimeAware: isTimeAware ?? false,
    };
  }

  constructor(sourceDescriptor: any) {
    this._descriptor = sourceDescriptor;
  }

  cloneDescriptor(): CustomRasterSourceDescriptor {
    return {
      type: this._descriptor.type,
      urlTemplate: this._descriptor.urlTemplate,
      isTimeAware: this._descriptor.isTimeAware,
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
    return this._descriptor.isTimeAware;
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
    return this._descriptor.isTimeAware;
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
    if (!this.getApplyGlobalTime() || (await !this.isTimeAware())) {
      return this._descriptor.urlTemplate;
    }

    const { timeslice, timeFilters } = dataFilters;
    let timestamp;

    if (timeslice) {
      // Use the value from the timeslider
      timestamp = new Date(timeslice.to).getTime();
    } else {
      // Otherwise use the max value from the Time Picker
      const { max } = calculateBounds(timeFilters);
      timestamp = max?.valueOf();
    }

    if (timestamp === undefined || timestamp === null) return this._descriptor.urlTemplate;

    // Replace the '{time}' template value in the URL with the Unix timestamp
    return this._descriptor.urlTemplate.replace('{time}', timestamp.toString());
  }
}
