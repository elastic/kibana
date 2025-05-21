/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import React from 'react';
import { GeoJsonProperties, Geometry, Position } from 'geojson';
import { AbstractSource, ImmutableSourceProperty, SourceEditorArgs } from '../source';
import {
  BoundsRequestMeta,
  GetFeatureActionsArgs,
  GeoJsonWithMeta,
  IMvtVectorSource,
} from '../vector_source';
import {
  FIELD_ORIGIN,
  MAX_ZOOM,
  MIN_ZOOM,
  SOURCE_TYPES,
  VECTOR_SHAPE_TYPE,
} from '../../../../common/constants';
import { getDataSourceLabel, getUrlLabel } from '../../../../common/i18n_getters';
import {
  MapExtent,
  MVTFieldDescriptor,
  TiledSingleLayerVectorSourceDescriptor,
  TooltipFeatureAction,
} from '../../../../common/descriptor_types';
import { MVTField } from '../../fields/mvt_field';
import { UpdateSourceEditor } from './update_source_editor';
import { ITooltipProperty, TooltipProperty } from '../../tooltips/tooltip_property';

export const sourceTitle = i18n.translate(
  'xpack.maps.source.MVTSingleLayerVectorSource.sourceTitle',
  {
    defaultMessage: 'Vector tiles',
  }
);

export class MVTSingleLayerVectorSource extends AbstractSource implements IMvtVectorSource {
  static createDescriptor({
    urlTemplate,
    layerName,
    minSourceZoom,
    maxSourceZoom,
    fields,
    tooltipProperties,
  }: Partial<TiledSingleLayerVectorSourceDescriptor>) {
    return {
      type: SOURCE_TYPES.MVT_SINGLE_LAYER,
      id: uuidv4(),
      urlTemplate: urlTemplate ? urlTemplate : '',
      layerName: layerName ? layerName : '',
      minSourceZoom:
        typeof minSourceZoom === 'number' ? Math.max(MIN_ZOOM, minSourceZoom) : MIN_ZOOM,
      maxSourceZoom:
        typeof maxSourceZoom === 'number' ? Math.min(MAX_ZOOM, maxSourceZoom) : MAX_ZOOM,
      fields: fields ? fields : [],
      tooltipProperties: tooltipProperties ? tooltipProperties : [],
    };
  }

  readonly _descriptor: TiledSingleLayerVectorSourceDescriptor;
  readonly _tooltipFields: MVTField[];

  constructor(sourceDescriptor: TiledSingleLayerVectorSourceDescriptor) {
    super(sourceDescriptor);
    this._descriptor = MVTSingleLayerVectorSource.createDescriptor(sourceDescriptor);

    this._tooltipFields = this._descriptor.tooltipProperties
      .map((fieldName) => {
        return this.getFieldByName(fieldName);
      })
      .filter((f) => f !== null) as MVTField[];
  }

  isMvt() {
    return true;
  }

  async supportsFitToBounds() {
    return false;
  }

  renderSourceSettingsEditor({ onChange }: SourceEditorArgs) {
    return (
      <UpdateSourceEditor onChange={onChange} tooltipFields={this._tooltipFields} source={this} />
    );
  }

  addFeature(geometry: Geometry | Position[]): Promise<void> {
    throw new Error('Does not implement addFeature');
  }

  deleteFeature(featureId: string): Promise<void> {
    throw new Error('Does not implement deleteFeature');
  }

  getMVTFields(): MVTField[] {
    return this._descriptor.fields.map((field: MVTFieldDescriptor) => {
      return new MVTField({
        fieldName: field.name,
        type: field.type,
        source: this,
        origin: FIELD_ORIGIN.SOURCE,
      });
    });
  }

  getFieldByName(fieldName: string): MVTField | null {
    const field = this._descriptor.fields.find((f: MVTFieldDescriptor) => {
      return f.name === fieldName;
    });
    return field
      ? new MVTField({
          fieldName: field.name,
          type: field.type,
          source: this,
          origin: FIELD_ORIGIN.SOURCE,
        })
      : null;
  }

  getGeoJsonWithMeta(): Promise<GeoJsonWithMeta> {
    // Having this method here is a consequence of IMvtVectorSource extending IVectorSource.
    throw new Error('Does not implement getGeoJsonWithMeta');
  }

  async getFields(): Promise<MVTField[]> {
    return this.getMVTFields();
  }

  getTileSourceLayer(): string {
    return this._descriptor.layerName;
  }

  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
    return [
      { label: getDataSourceLabel(), value: sourceTitle },
      { label: getUrlLabel(), value: this._descriptor.urlTemplate },
    ];
  }

  async getDisplayName(): Promise<string> {
    return this.getTileSourceLayer();
  }

  async getTileUrl(): Promise<string> {
    return this._descriptor.urlTemplate;
  }

  async getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]> {
    return [VECTOR_SHAPE_TYPE.POINT, VECTOR_SHAPE_TYPE.LINE, VECTOR_SHAPE_TYPE.POLYGON];
  }

  hasTooltipProperties(): boolean {
    return !!this._tooltipFields.length;
  }

  getMinZoom(): number {
    return this._descriptor.minSourceZoom;
  }

  getMaxZoom(): number {
    return this._descriptor.maxSourceZoom;
  }

  async getBoundsForFilters(
    boundsFilters: BoundsRequestMeta,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<MapExtent | null> {
    return null;
  }

  getSyncMeta() {
    return {
      mvtFields: this._descriptor.fields.map((field: MVTFieldDescriptor) => {
        return field.name;
      }),
    };
  }

  isBoundsAware() {
    return false;
  }

  getSourceStatus() {
    return { tooltipContent: null, areResultsTrimmed: false };
  }

  async getLeftJoinFields() {
    return [];
  }

  async getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]> {
    const tooltips = [];
    for (const key in properties) {
      if (Object.hasOwn(properties, key)) {
        for (let i = 0; i < this._tooltipFields.length; i++) {
          const mvtField = this._tooltipFields[i];
          if (mvtField.getName() === key) {
            const tooltip = new TooltipProperty(key, key, properties[key]);
            tooltips.push(tooltip);
            break;
          }
        }
      }
    }
    return tooltips;
  }

  async getTimesliceMaskFieldName() {
    return null;
  }

  async supportsFeatureEditing(): Promise<boolean> {
    return false;
  }

  supportsJoins(): boolean {
    return false;
  }

  getFeatureActions(args: GetFeatureActionsArgs): TooltipFeatureAction[] {
    // Its not possible to filter by geometry for vector tile sources since there is no way to get original geometry
    return [];
  }

  getInspectorRequestIds(): string[] {
    return [];
  }
}
