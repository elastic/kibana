/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import type { Query } from '@kbn/es-query';
import { asyncMap } from '@kbn/std';
import React, { ReactElement } from 'react';
import { EuiIcon } from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';
import { LAYER_TYPE, MAX_ZOOM, MIN_ZOOM } from '../../../../common/constants';
import { DataRequest } from '../../util/data_request';
import { copyPersistentState } from '../../../reducers/copy_persistent_state';
import {
  Attribution,
  CustomIcon,
  LayerDescriptor,
  LayerGroupDescriptor,
  MapExtent,
  StyleDescriptor,
  StyleMetaDescriptor,
} from '../../../../common/descriptor_types';
import { ISource, SourceEditorArgs } from '../../sources/source';
import { type DataRequestContext } from '../../../actions';
import { getLayersExtent } from '../../../actions/get_layers_extent';
import { ILayer, LayerIcon, LayerMessage } from '../layer';
import { IStyle } from '../../styles/style';
import { LICENSED_FEATURES } from '../../../licensed_features';

export function isLayerGroup(layer: ILayer): layer is LayerGroup {
  return layer instanceof LayerGroup;
}

export const DEFAULT_LAYER_GROUP_LABEL = i18n.translate('xpack.maps.layerGroup.defaultName', {
  defaultMessage: 'Layer group',
});

export class LayerGroup implements ILayer {
  protected readonly _descriptor: LayerGroupDescriptor;
  private _children: ILayer[] = [];

  static createDescriptor(options: Partial<LayerDescriptor>): LayerGroupDescriptor {
    return {
      ...options,
      type: LAYER_TYPE.LAYER_GROUP,
      id: typeof options.id === 'string' && options.id.length ? options.id : uuidv4(),
      label:
        typeof options.label === 'string' && options.label.length
          ? options.label
          : DEFAULT_LAYER_GROUP_LABEL,
      sourceDescriptor: null,
      visible: typeof options.visible === 'boolean' ? options.visible : true,
    };
  }

  constructor({ layerDescriptor }: { layerDescriptor: Partial<LayerGroupDescriptor> }) {
    this._descriptor = LayerGroup.createDescriptor(layerDescriptor);
  }

  setChildren(children: ILayer[]) {
    this._children = children;
  }

  getChildren(): ILayer[] {
    return [...this._children];
  }

  async _asyncSomeChildren(methodName: string) {
    const promises = this.getChildren().map(async (child) => {
      // @ts-ignore
      return (child[methodName] as () => Promise<boolean>)();
    });
    return ((await Promise.all(promises)) as boolean[]).some((result) => {
      return result;
    });
  }

  getDescriptor(): LayerGroupDescriptor {
    return this._descriptor;
  }

  async cloneDescriptor(): Promise<LayerDescriptor[]> {
    const clonedDescriptor = copyPersistentState(this._descriptor);
    clonedDescriptor.id = uuidv4();
    const displayName = await this.getDisplayName();
    clonedDescriptor.label = `Clone of ${displayName}`;

    const childrenDescriptors = await asyncMap(this.getChildren(), async (childLayer) => {
      return (await childLayer.cloneDescriptor()).map((childLayerDescriptor) => {
        if (childLayerDescriptor.parent === this.getId()) {
          childLayerDescriptor.parent = clonedDescriptor.id;
        }
        return childLayerDescriptor;
      });
    });

    return [..._.flatten(childrenDescriptors), clonedDescriptor];
  }

  makeMbLayerId(layerNameSuffix: string): string {
    throw new Error(
      'makeMbLayerId should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  isPreviewLayer(): boolean {
    return !!this._descriptor.__isPreviewLayer;
  }

  async supportsFitToBounds(): Promise<boolean> {
    return this._asyncSomeChildren('supportsFitToBounds');
  }

  async isFittable(): Promise<boolean> {
    return this._asyncSomeChildren('isFittable');
  }

  isIncludeInFitToBounds(): boolean {
    return this.getChildren().some((child) => {
      return child.isIncludeInFitToBounds();
    });
  }

  async isFilteredByGlobalTime(): Promise<boolean> {
    return this._asyncSomeChildren('isFilteredByGlobalTime');
  }

  async getDisplayName(source?: ISource): Promise<string> {
    return this.getLabel();
  }

  async getAttributions(): Promise<Attribution[]> {
    return [];
  }

  getStyleForEditing(): IStyle {
    throw new Error(
      'getStyleForEditing should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  getStyle(): IStyle {
    throw new Error(
      'getStyle should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  getCurrentStyle(): IStyle {
    throw new Error(
      'getCurrentStyle should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  getLabel(): string {
    return this._descriptor.label ? this._descriptor.label : '';
  }

  getLocale(): string | null {
    return null;
  }

  getLayerIcon(isTocIcon: boolean): LayerIcon {
    return {
      icon: <EuiIcon size="m" type="layers" />,
      tooltipContent: '',
    };
  }

  async hasLegendDetails(): Promise<boolean> {
    return this._children.length > 0;
  }

  renderLegendDetails(): ReactElement<any> | null {
    return null;
  }

  getId(): string {
    return this._descriptor.id;
  }

  getSource(): ISource {
    throw new Error(
      'getSource should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  getSourceForEditing(): ISource {
    throw new Error(
      'getSourceForEditing should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  isVisible(): boolean {
    return !!this._descriptor.visible;
  }

  showAtZoomLevel(zoom: number): boolean {
    return zoom >= this.getMinZoom() && zoom <= this.getMaxZoom();
  }

  /*
   * Returns smallest min from children or MIN_ZOOM when there are no children
   */
  getMinZoom(): number {
    let min: number | undefined;
    this._children.forEach((child) => {
      if (min !== undefined) {
        min = Math.min(min, child.getMinZoom());
      } else {
        min = child.getMinZoom();
      }
    });
    return min !== undefined ? min : MIN_ZOOM;
  }

  /*
   * Returns largest max from children or MAX_ZOOM when there are no children
   */
  getMaxZoom(): number {
    let max: number | undefined;
    this._children.forEach((child) => {
      if (max !== undefined) {
        max = Math.max(max, child.getMaxZoom());
      } else {
        max = child.getMaxZoom();
      }
    });
    return max !== undefined ? max : MAX_ZOOM;
  }

  getMinSourceZoom(): number {
    let min = MIN_ZOOM;
    this._children.forEach((child) => {
      min = Math.max(min, child.getMinSourceZoom());
    });
    return min;
  }

  getMbSourceId(): string {
    throw new Error(
      'getMbSourceId should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  getAlpha(): number {
    throw new Error(
      'getAlpha should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  getQuery(): Query | null {
    return null;
  }

  renderSourceSettingsEditor(sourceEditorArgs: SourceEditorArgs) {
    return null;
  }

  getPrevRequestToken(dataId: string): symbol | undefined {
    return undefined;
  }

  getInFlightRequestTokens(): symbol[] {
    return [];
  }

  getSourceDataRequest(): DataRequest | undefined {
    return undefined;
  }

  getDataRequest(id: string): DataRequest | undefined {
    return undefined;
  }

  isLayerLoading(zoom: number): boolean {
    if (!this.isVisible()) {
      return false;
    }

    return this._children.some((child) => {
      return child.isLayerLoading(zoom);
    });
  }

  hasErrors(): boolean {
    return this._children.some((child) => {
      return child.hasErrors();
    });
  }

  getErrors(): LayerMessage[] {
    return this.hasErrors()
      ? [
          {
            title: i18n.translate('xpack.maps.layerGroup.childrenErrorMessage', {
              defaultMessage: `An error occurred when loading nested layers`,
            }),
            body: '',
          },
        ]
      : [];
  }

  hasWarnings(): boolean {
    return this._children.some((child) => {
      return child.hasWarnings();
    });
  }

  getWarnings(): LayerMessage[] {
    return this.hasWarnings()
      ? [
          {
            title: i18n.translate('xpack.maps.layerGroup.incompleteResultsWarning', {
              defaultMessage: `Nested layer(s) had issues returning data and results might be incomplete.`,
            }),
            body: '',
          },
        ]
      : [];
  }

  async syncData(syncContext: DataRequestContext) {
    // layer group does not render to map so there is never sync data request
  }

  getMbLayerIds(): string[] {
    return [];
  }

  ownsMbLayerId(layerId: string): boolean {
    return false;
  }

  ownsMbSourceId(mbSourceId: string): boolean {
    return false;
  }

  syncLayerWithMB(mbMap: MbMap) {
    // layer group does not render to map so there is never sync data request
  }

  getLayerTypeIconName(): string {
    return 'layers';
  }

  async getBounds(
    getDataRequestContext: (layerId: string) => DataRequestContext
  ): Promise<MapExtent | null> {
    return getLayersExtent(this.getChildren(), getDataRequestContext);
  }

  renderStyleEditor(
    onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void,
    onCustomIconsChange: (customIcons: CustomIcon[]) => void
  ): ReactElement<any> | null {
    return null;
  }

  getIndexPatternIds(): string[] {
    return [];
  }

  getQueryableIndexPatternIds(): string[] {
    return [];
  }

  syncVisibilityWithMb(mbMap: unknown, mbLayerId: string) {
    throw new Error(
      'syncVisibilityWithMb should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  getType(): LAYER_TYPE {
    return LAYER_TYPE.LAYER_GROUP;
  }

  areLabelsOnTop(): boolean {
    return false;
  }

  supportsLabelsOnTop(): boolean {
    return false;
  }

  supportsLabelLocales(): boolean {
    return false;
  }

  async getLicensedFeatures(): Promise<LICENSED_FEATURES[]> {
    return [];
  }

  getGeoFieldNames(): string[] {
    return [];
  }

  async getStyleMetaDescriptorFromLocalFeatures(): Promise<StyleMetaDescriptor | null> {
    throw new Error(
      'getStyleMetaDescriptorFromLocalFeatures should not be called on LayerGroup, LayerGroup does not render to map'
    );
  }

  isBasemap(order: number): boolean {
    return false;
  }

  getParent(): string | undefined {
    return this._descriptor.parent;
  }
}
