/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the Elastic License
//  * 2.0; you may not use this file except in compliance with the Elastic License
//  * 2.0.
//  */

import { ReactElement } from 'react';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import { FieldFormatter, MIN_ZOOM, MAX_ZOOM } from '@kbn/maps-plugin/common';
import type {
  AbstractSourceDescriptor,
  Attribution,
  DataRequestMeta,
  Timeslice,
} from '@kbn/maps-plugin/common/descriptor_types';
import type {
  IField,
  ImmutableSourceProperty,
  ITMSSource,
  SourceEditorArgs,
} from '@kbn/maps-plugin/public';
import { getTimeFilter } from '../kibana_services';

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
  readonly _timefilter: TimefilterContract;

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
    this._timefilter = getTimeFilter();
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
    // TODO
    return true;
  }

  async getUrlTemplate(): Promise<string> {
    const { max } = this._timefilter.getBounds();
    if (!max || !this.getApplyGlobalTime() || (await !this.isTimeAware())) {
      return this._descriptor.urlTemplate;
    }

    return this._descriptor.urlTemplate.replace('{time}', max.toISOString().split('.')[0] + 'Z');
  }
}
