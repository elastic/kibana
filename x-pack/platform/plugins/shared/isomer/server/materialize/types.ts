/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ColorMapping } from '@kbn/coloring';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { AggConfigSerialized, SerializedValue } from '@kbn/data-plugin/common';
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

/** An ES|QL query request, planned with the context's time range, filters, query, and controls. */
export interface EsqlDataRequest {
  /** Request kind discriminator. */
  kind: 'esql';
  /** ES|QL query to run. */
  query: string;
  /** Named ES|QL parameter values. */
  params?: Record<string, EsqlParamValue>;
  /** The date field the time range filters on. Without one, only `?_tstart` and `?_tend` apply. */
  timeField?: string;
  /**
   * Without a `timeField`, the time range filters on this field when every index the query reads
   * maps it, as Kibana's ES|QL time field resolution does for `@timestamp`.
   */
  defaultTimeField?: string;
  /** At most this many rows, below the pipeline's own cap. */
  maxRows?: number;
  /** Optional context that overrides or extends the parent's context. */
  context?: MaterializeContextOverride;
}

/** An aggregation request for a data view. */
interface AggsDataRequest {
  /** Request kind discriminator. */
  kind: 'aggs';
  /** Data view ID or title. */
  dataView: string;
  /** Serialized aggregations to execute. */
  aggs: AggConfigSerialized[];
  /** Optional aggregation time shift. */
  timeShift?: string;
  /** Optional context that overrides or extends the parent's context. */
  context?: MaterializeContextOverride;
}

/** A document search request for a data view. */
interface SearchDataRequest {
  /** Request kind discriminator. */
  kind: 'search';
  /** Data view ID or title. */
  dataView: string;
  /** Fields to return for each document. */
  columns: string[];
  /** Elasticsearch sort definition. */
  sort?: estypes.Sort;
  /** Maximum number of documents to return. */
  size: number;
  /** Optional context that overrides or extends the parent's context. */
  context?: MaterializeContextOverride;
}

/** Another saved object, materialized with this one's context: a dashboard's panels. */
interface MaterializeDataRequest {
  /** Request kind discriminator. */
  kind: 'materialize';
  /** Saved object reference or by-value config to materialize. */
  input: MaterializeInput;
  /** Optional context that overrides or extends the parent's context. */
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
  /** The context supplied to `plan`. */
  context: MaterializeContext;
  /** A Kibana field format as a portable format, or how its values arrive instead. */
  toPortableFormat(format: SerializedFieldFormat | undefined, type: ChartColumnType): FormatMapping;
  /** A Kibana `Datatable` as a chart's columnar `data`, with what didn't carry over as losses. */
  toChartData(table: Datatable, options?: ToChartDataOptions): ChartDataResult;
  /** The first `count` colors of a Kibana palette, for light and dark. Defaults to Kibana's default palette. */
  paletteColors(count: number, paletteId?: string): ConcreteColor[];
  /** The color a Kibana color mapping gives each category, for light and dark, in order. */
  colorMappingColors(
    categories: SerializedValue[],
    colorMapping: ColorMapping.Config
  ): ConcreteColor[];
}

/** The user-scoped services a by-reference load runs with. */
export interface MaterializeScope {
  /** Authenticated request that scopes all saved-object access. */
  request: KibanaRequest;
  /** Saved objects client scoped to `request`. */
  savedObjectsClient: SavedObjectsClientContract;
  /** Aborts when the request or caller cancels the work. */
  abortSignal: AbortSignal;
}

/** How a placeholder for a config describes it, when materializing it fails. */
export interface MaterializeDescription {
  /** Human-readable title for the placeholder. */
  title?: string;
  /** Optional link back to the source object. */
  link?: { href: string; label: string };
}

/**
 * Materializes one saved object type's as-code config into a known Isomer node.
 *
 * `parse` and `map` must be deterministic and must not perform data access. The pipeline validates
 * the mapped node before returning it.
 */
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
  /**
   * Materializes `input`; failures return a validated `unsupported` node with a reason.
   *
   * @param input Saved object reference or by-value config.
   * @param context Optional query, filters, time range, controls, time zone, and locale.
   */
  materialize(input: MaterializeInput, context?: MaterializeContext): Promise<MaterializedNode>;
  /**
   * Resolves the Kibana filters represented by a chart selection, for a host to keep and pass back
   * in `context.filters`.
   *
   * @param event Selection event referring to a chart node.
   * @param node Materialized node that produced the event.
   */
  filtersForSelection(event: ChartEvent, node: MaterializedNode): Promise<Filter[]>;
}
