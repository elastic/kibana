import type { CoreStart } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { TextBasedPrivateState, TextBasedPersistedState, Datasource } from '@kbn/lens-common';
export declare function getTextBasedDatasource({ core, storage, data, expressions, dataViews, }: {
    core: CoreStart;
    storage: IStorageWrapper;
    data: DataPublicPluginStart;
    expressions: ExpressionsStart;
    dataViews: DataViewsPublicPluginStart;
}): Datasource<TextBasedPrivateState, TextBasedPersistedState, import("@kbn/es-query").Query | AggregateQuery>;
