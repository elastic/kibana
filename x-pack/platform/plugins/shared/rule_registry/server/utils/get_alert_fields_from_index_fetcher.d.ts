import type { FieldDescriptor, IndexPatternsFetcher } from '@kbn/data-views-plugin/server';
export declare const getAlertFieldsFromIndexFetcher: (indexPatternsFetcher: IndexPatternsFetcher, indices: string[]) => Promise<FieldDescriptor[]>;
