import { type AggregateQuery, type Query } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { LensEmbeddableStartServices } from '../types';
export declare function isESQLModeEnabled({ uiSettings }: Pick<LensEmbeddableStartServices, 'uiSettings'>): any;
export declare function getEmbeddableVariables(query: Query | AggregateQuery, esqlVariables: ESQLControlVariable[]): ESQLControlVariable[] | undefined;
