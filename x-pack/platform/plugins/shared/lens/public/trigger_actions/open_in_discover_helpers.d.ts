import { type AggregateQuery, type Filter, type Query, type TimeRange } from '@kbn/es-query';
import type { DataViewsService } from '@kbn/data-views-plugin/public';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import { type EmbeddableApiContext } from '@kbn/presentation-publishing';
interface DiscoverAppLocatorParams extends SerializableRecord {
    timeRange?: TimeRange;
    filters?: Filter[];
    indexPatternId?: string;
    query?: Query | AggregateQuery | undefined;
    columns?: string[];
}
export type DiscoverAppLocator = LocatorPublic<DiscoverAppLocatorParams>;
type Context = EmbeddableApiContext & {
    filters?: Filter[];
    openInSameTab?: boolean;
    hasDiscoverAccess: boolean;
    dataViews: Pick<DataViewsService, 'get'>;
    locator?: DiscoverAppLocator;
    timeFieldName?: string;
};
export declare function isCompatible({ hasDiscoverAccess, embeddable }: Context): boolean;
export declare function getHref({ embeddable, locator, filters, dataViews, timeFieldName }: Context): Promise<string | undefined>;
export declare function getLocation({ embeddable, locator, filters, dataViews, timeFieldName, }: Context): Promise<import("@kbn/share-plugin/public").KibanaLocation<object>>;
export declare function execute({ embeddable, locator, filters, openInSameTab, dataViews, timeFieldName, hasDiscoverAccess, }: Context): Promise<void>;
export {};
