/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
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
