/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query } from '@kbn/data-plugin/common/query';
import {
  RuleType,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  RuleTypeParams,
} from '@kbn/alerting-plugin/server';
import { ActionGroupId, RecoveryActionGroupId } from './constants';

export interface BoundariesRequestMeta {
  geoField: string;
  boundaryIndexTitle: string;
  boundaryGeoField: string;
  boundaryNameField?: string;
  boundaryIndexQuery?: Query;
}

export interface GeoContainmentRuleParams extends RuleTypeParams {
  index: string;
  indexId: string;
  geoField: string;
  entity: string;
  dateField: string;
  boundaryType: string;
  boundaryIndexTitle: string;
  boundaryIndexId: string;
  boundaryGeoField: string;
  boundaryNameField?: string;
  indexQuery?: Query;
  boundaryIndexQuery?: Query;
}

export type GeoContainmentExtractedRuleParams = Omit<
  GeoContainmentRuleParams,
  'indexId' | 'boundaryIndexId'
> & {
  indexRefName: string;
  boundaryIndexRefName: string;
};

export interface GeoContainmentRuleState extends RuleTypeState {
  boundariesRequestMeta?: BoundariesRequestMeta;
  shapesFilters: Record<string, unknown>;
  shapesIdsNamesMap: Record<string, unknown>;
  prevLocationMap: Record<string, unknown>;
}

export interface GeoContainmentAlertInstanceState extends AlertInstanceState {
  // 8.10-, location is [lon, lat] array.
  // continue to populate 'location' for backwards compatibility with persisted alert instance state and ZDT
  location: number[];
  // 8.11+, location will be wkt represenation of geometry.
  locationWkt?: string;
  shapeLocationId: string;
  dateInShape: string | null;
  docId: string;
}

export interface GeoContainmentAlertInstanceContext extends AlertInstanceContext {
  entityId: string;
  entityDateTime: string | null;
  entityDocumentId: string;
  detectionDateTime: string;
  entityLocation: string;
  // recovered alerts are not contained in boundary so context does not include boundary state
  containingBoundaryId?: string;
  containingBoundaryName?: unknown;
}

export type GeoContainmentRuleType = RuleType<
  GeoContainmentRuleParams,
  GeoContainmentExtractedRuleParams,
  GeoContainmentRuleState,
  GeoContainmentAlertInstanceState,
  GeoContainmentAlertInstanceContext,
  typeof ActionGroupId,
  typeof RecoveryActionGroupId
>;
