/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimeRange } from 'src/plugins/data/public';
import {
  EmbeddableInput,
  EmbeddableOutput,
  IEmbeddable,
  EmbeddableFactory,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { inputsModel } from '../../store/inputs';
import { Query, esFilters } from '../../../../../../../src/plugins/data/public';

export interface MapEmbeddableInput extends EmbeddableInput {
  filters: esFilters.Filter[];
  query: Query;
  refreshConfig: {
    isPaused: boolean;
    interval: number;
  };
  timeRange?: TimeRange;
}

export type MapEmbeddable = IEmbeddable<MapEmbeddableInput, EmbeddableOutput>;

export interface IndexPatternMapping {
  title: string;
  id: string;
}

export interface LayerMappingDetails {
  metricField: string;
  geoField: string;
  tooltipProperties: string[];
  label: string;
}

export interface LayerMapping {
  source: LayerMappingDetails;
  destination: LayerMappingDetails;
}

export interface LayerMappingCollection {
  [indexPatternTitle: string]: LayerMapping;
}

export type SetQuery = (params: {
  id: string;
  inspect: inputsModel.InspectQuery | null;
  loading: boolean;
  refetch: inputsModel.Refetch;
}) => void;

export interface MapFeature {
  id: number;
  layerId: string;
}

export interface LoadFeatureProps {
  layerId: string;
  featureId: number;
}

export interface FeatureProperty {
  _propertyKey: string;
  _rawValue: string | string[];
}

export interface FeatureGeometry {
  coordinates: [number];
  type: string;
}

export interface RenderTooltipContentParams {
  addFilters(filter: object): void;
  closeTooltip(): void;
  features: MapFeature[];
  isLocked: boolean;
  getLayerName(layerId: string): Promise<string>;
  loadFeatureProperties({ layerId, featureId }: LoadFeatureProps): Promise<FeatureProperty[]>;
  loadFeatureGeometry({ layerId, featureId }: LoadFeatureProps): FeatureGeometry;
}

export type MapToolTipProps = Partial<RenderTooltipContentParams>;

export interface EmbeddableApi {
  getEmbeddableFactory: (embeddableFactoryId: string) => EmbeddableFactory;
  registerEmbeddableFactory: (id: string, factory: EmbeddableFactory) => void;
}
