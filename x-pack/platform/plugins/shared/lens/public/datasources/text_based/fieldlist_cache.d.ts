import { type AggregateQuery } from '@kbn/es-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import type { TextBasedLayerColumn } from '@kbn/lens-common';
export declare const addColumnsToCache: (query: AggregateQuery, list: DatatableColumn[]) => void;
export declare const getColumnsFromCache: (query: AggregateQuery) => DatatableColumn[];
export declare const retrieveLayerColumnsFromCache: (existingColumns: TextBasedLayerColumn[], query?: AggregateQuery) => TextBasedLayerColumn[];
