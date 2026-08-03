import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { DataViewsService } from '@kbn/data-views-plugin/public';
import { type DiscoverAppLocator } from './open_in_discover_helpers';
export declare const createOpenInDiscoverAction: (locator: DiscoverAppLocator, dataViews: Pick<DataViewsService, "get">, hasDiscoverAccess: boolean) => import("@kbn/ui-actions-plugin/public").Action<EmbeddableApiContext, object>;
