export type * from './src/types';
export * from './src/client';
export { CHANGE_HISTORY_AGGREGATE_FIELDS } from './src/types';
export { DEFAULT_FIELD_AGGREGATION_SIZE } from './src/constants';
/**
 * @internal exported for test use only — do NOT use in production code,
 * this could cause the index to be created before the feature is ready for GA
 */
export { FLAGS } from './src/constants';
