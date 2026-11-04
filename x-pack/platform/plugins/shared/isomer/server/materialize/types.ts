/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { AggConfigSerialized } from '@kbn/data-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { ChartDataResult, ToChartDataOptions } from './kit/chart_data';
import type { ConcreteColor } from './kit/colors';
import type { FormatMapping } from './kit/formats';
import type { ChartColumnType } from './kit/types';
import type { MaterializeContext, MaterializeInput } from '../../common';
import type { ChartEvent, MaterializedNode, UnsupportedNode } from './nodes';

/**
 * Context a parent passes down for one request: a dashboard's panel overrides, or a materializer's
 * own. Fields replace the parent's, except `filters`, which are added to the parent's.
 */
export interface MaterializeContextOverride extends MaterializeContext {
  /** Drops the parent's filters and query, as a panel's "ignore global filters" does. */
  ignoreGlobalFilters?: boolean;
}

/** A named ES|QL param's value, as Kibana's ES|QL search takes it. */
export type EsqlParamValue = string | number | Array<string | number>;

/** An ES|QL query, run as the user with the context's time range, filters, query and controls. */
export interface EsqlDataRequest {
  kind: 'esql';
  query: string;
  params?: Record<string, EsqlParamValue>;
  /** The date field the time range filters on. Without one, only `?_tstart` and `?_tend` apply. */
  timeField?: string;
  /** At most this many rows, below the pipeline's own cap. */
  maxRows?: number;
  context?: MaterializeContextOverride;
}

/** Aggregations over a data view, run through the server aggs service. */
export interface AggsDataRequest {
  kind: 'aggs';
  dataView: string;
  aggs: AggConfigSerialized[];
  timeShift?: string;
  context?: MaterializeContextOverride;
}

/** Documents from a data view. */
export interface SearchDataRequest {
  kind: 'search';
  dataView: string;
  columns: string[];
  sort?: estypes.Sort;
  size: number;
  context?: MaterializeContextOverride;
}

/** Another saved object, materialized with this one's context: a dashboard's panels. */
export interface MaterializeDataRequest {
  kind: 'materialize';
  input: MaterializeInput;
  context?: MaterializeContextOverride;
}

/** The requests a materializer plans. The pipeline runs them; materializers never query. */
export type DataRequest =
  | EsqlDataRequest
  | AggsDataRequest
  | SearchDataRequest
  | MaterializeDataRequest;

/** The results of a plan, each list in the order of its requests. */
export interface MaterializeResults {
  /** One per `esql`, `aggs` and `search` request. */
  tables: Datatable[];
  /** One per `materialize` request. */
  nodes: MaterializedNode[];
}

/** Helpers a materializer maps with, so every materializer formats and colors as Kibana does. */
export interface MaterializeKit {
  /** The context the plan ran in, after merging. */
  context: MaterializeContext;
  /** A Kibana field format as a portable format, or how its values arrive instead. */
  toPortableFormat(format: SerializedFieldFormat | undefined, type: ChartColumnType): FormatMapping;
  /** A Kibana `Datatable` as a chart's columnar `data`, with what didn't carry over as losses. */
  toChartData(table: Datatable, options?: ToChartDataOptions): ChartDataResult;
  /** The first `count` colors of a Kibana palette, for light and dark. Defaults to Kibana's default palette. */
  paletteColors(count: number, paletteId?: string): ConcreteColor[];
}

/** The user-scoped services a by-reference load runs with. */
export interface MaterializeScope {
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  abortSignal: AbortSignal;
}

/** How a placeholder for a config describes it, when materializing it fails. */
export interface MaterializeDescription {
  title?: string;
  link?: { href: string; label: string };
}

/** Materializes one saved object type's as-code config into a known Isomer node. */
export interface Materializer<TConfig = unknown> {
  /** Recorded in provenance. Bump it when the nodes it produces change. */
  version: number;
  /** Checks a by-value or loaded config against the type's as-code schema, and throws when it doesn't match. */
  parse(config: unknown): TConfig;
  /** Loads a saved object as its as-code config. Without it, by-reference input is unsupported. */
  load?(id: string, scope: MaterializeScope): Promise<unknown>;
  /** The title and deep link a placeholder carries when this config fails. */
  describe?(config: TConfig): MaterializeDescription;
  /** The data the config needs, or why it can't be materialized. */
  plan(config: TConfig, context: MaterializeContext): DataRequest[] | UnsupportedNode;
  /** The node for the config and its data. Pure: it never queries. */
  map(config: TConfig, results: MaterializeResults, kit: MaterializeKit): MaterializedNode;
}

/** Materialization as one user, for one request. */
export interface ScopedMaterializeClient {
  /** A node for `input` that always renders: `unsupported` with a reason when materializing fails. */
  materialize(input: MaterializeInput, context?: MaterializeContext): Promise<MaterializedNode>;
  /** The Kibana filters a selection on `node` stands for, for a host to keep and pass back in `context.filters`. */
  filtersForSelection(event: ChartEvent, node: MaterializedNode): Promise<Filter[]>;
}
