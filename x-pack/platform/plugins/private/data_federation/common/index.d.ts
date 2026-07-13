export type { DataSource, DataSourceType, DataSourceWithSecrets } from './datasource_types';
export { ALL_DATA_SOURCE_TYPES, DATA_SOURCE_TYPES_TO_HELP_TEXT, DATA_SOURCE_TYPES_TO_ICONS, ES_REDACTED_SECRET_VALUE, SECRET_FIELDS_BY_TYPE, UI_MANAGED_SECRET_FIELDS_BY_TYPE, } from './datasource_types';
export declare const PLUGIN_ID = "data_federation";
/** Base path for this plugin's HTTP APIs (internal). */
export declare const INTERNAL_API_BASE_PATH: "/internal/data_federation";
/** GET — list data sources (proxies to Elasticsearch `GET /_query/datasource`). */
export declare const DATA_SOURCES_LIST_ROUTE_PATH: "/internal/data_federation/data_sources";
/**
 * By-id data source routes (Kibana path; `{id}` is a path parameter).
 * - GET → Elasticsearch `GET /_query/datasource/{id}`
 * - PUT → Elasticsearch `PUT /_query/datasource/{id}` (create data source)
 * - DELETE → Elasticsearch `DELETE /_query/datasource/{id}`
 */
export declare const DATA_SOURCE_BY_ID_ROUTE_PATH: "/internal/data_federation/data_sources/{id}";
/** Resolves `DATA_SOURCE_BY_ID_ROUTE_PATH` with a URL-encoded id segment. */
export declare function getDataSourceByIdApiPath(id: string): string;
/** GET — list data sets (proxies to Elasticsearch `GET /_query/data_set`). */
export declare const DATA_SETS_LIST_ROUTE_PATH: "/internal/data_federation/dataset";
/**
 * By-id data set routes (Kibana path; `{id}` is a path parameter).
 * - GET → Elasticsearch `GET /_query/data_set/{id}`
 * - PUT → Elasticsearch `PUT /_query/data_set/{id}` (create data set)
 * - DELETE → Elasticsearch `DELETE /_query/data_set/{id}`
 */
export declare const DATA_SET_BY_ID_ROUTE_PATH: "/internal/data_federation/dataset/{id}";
/** Resolves `DATA_SET_BY_ID_ROUTE_PATH` with a URL-encoded id segment. */
export declare function getDataSetByIdApiPath(id: string): string;
export type { Dataset, DataSetWithName, DatasetSettings } from './dataset_types';
export declare const PLUGIN_NAME: string;
export declare const DATA_SOURCE_BY_ID_PATH = "/_query/data_source/{id}";
export declare const DATA_SET_BY_ID_PATH = "/_query/dataset/{id}";
