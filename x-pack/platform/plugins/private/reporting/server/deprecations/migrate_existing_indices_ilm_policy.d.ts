import type { DeprecationsDetails, GetDeprecationsContext } from '@kbn/core/server';
export declare const getDeprecationsInfo: ({ esClient, }: GetDeprecationsContext) => Promise<DeprecationsDetails[]>;
