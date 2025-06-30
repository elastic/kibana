/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface NavigationItemBase {
  id: string;
  title: string;
  entityId?: string;
  dashboardId?: string;
  order?: number;
}

export interface DynamicNavigationItem extends NavigationItemBase {
  dashboardId: string;
}

export interface ObservabilityDynamicNavigation extends NavigationItemBase {
  subItems?: DynamicNavigationItem[];
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Attribute {
  ref: string;
  requirement_level?:
    | string
    | {
        conditionally_required: string;
      };
}

export interface RelationShipAttributeMapping {
  source_attribute: string;
  target_attribute: string;
}

export interface Relationship {
  type: string;
  target: string;
  brief?: string;
  attribute_mapping?: RelationShipAttributeMapping;
}

export interface EntityDefinition {
  id: string;
  type: string;
  stability: string;
  name: string;
  brief?: string;
  attributes?: Attribute[];

  // custom attributes
  relationships?: Relationship[];
}

export interface MetricDefinition {
  id: string;
  type: 'metric';
  metric_name: string;
  stability: 'development' | 'stable' | 'experimental';

  brief?: string;
  entity_associations?: string[];
  note?: string;
  instrument: 'gauge' | 'counter' | 'updowncounter';
  unit?: string;
  attributes?: Attribute[];
}

export type MetricDefinitionsResponse = Pick<
  MetricDefinition,
  'id' | 'type' | 'instrument' | 'unit'
> & { metricName: string };

export interface EntityDefinitionsResponse {
  id: string;
  name: string;
  attributes: string[];
  query?: string;
  metrics: MetricDefinitionsResponse[];
  relationships: string[];
}

export interface EnrichedEntityDefinitionsResponse extends EntityDefinitionsResponse {
  navigation?: ObservabilityDynamicNavigation;
}
