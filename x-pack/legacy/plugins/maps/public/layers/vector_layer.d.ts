/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { AbstractLayer } from './layer';
import { IVectorSource } from './sources/vector_source';
import { VectorLayerDescriptor } from '../../common/descriptor_types';
import { MapFilters, VectorSourceRequestMeta } from '../../common/data_request_descriptor_types';
import { ILayer } from './layer';
import { IJoin } from './joins/join';
import { IVectorStyle } from './styles/vector/vector_style';
import { IField } from './fields/field';
import { SyncContext } from '../actions/map_actions';

type VectorLayerArguments = {
  source: IVectorSource;
  joins: IJoin[];
  layerDescriptor: VectorLayerDescriptor;
};

export interface IVectorLayer extends ILayer {
  getFields(): Promise<IField[]>;
  getStyleEditorFields(): Promise<IField[]>;
  getValidJoins(): IJoin[];
}

export class VectorLayer extends AbstractLayer implements IVectorLayer {
  static createDescriptor(
    options: VectorLayerArguments,
    mapColors: string[]
  ): VectorLayerDescriptor;

  protected readonly _source: IVectorSource;
  protected readonly _style: IVectorStyle;

  constructor(options: VectorLayerArguments);

  getFields(): Promise<IField[]>;
  getStyleEditorFields(): Promise<IField[]>;
  getValidJoins(): IJoin[];
  _getSearchFilters(
    dataFilters: MapFilters,
    source: IVectorSource,
    style: IVectorStyle
  ): VectorSourceRequestMeta;
  _syncData(syncContext: SyncContext, source: IVectorSource, style: IVectorStyle): Promise<void>;
}
