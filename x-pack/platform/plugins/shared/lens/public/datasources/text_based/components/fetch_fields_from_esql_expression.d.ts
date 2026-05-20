import type { Query, AggregateQuery, TimeRange } from '@kbn/es-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { Datatable } from '@kbn/expressions-plugin/public';
export declare function fetchFieldsFromESQLExpression(query: Query | AggregateQuery, expressions: ExpressionsStart, time?: TimeRange, abortController?: AbortController, timeFieldName?: string, esqlVariables?: ESQLControlVariable[]): Promise<Datatable | undefined>;
