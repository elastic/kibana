import type { ApplicationStart } from '@kbn/core/public';
import type { ApplyGlobalFilterActionContext } from '@kbn/unified-search-plugin/public';
import type { DataViewsService } from '@kbn/data-views-plugin/public';
import type { LensApi } from '@kbn/lens-common-2';
import type { DrilldownDefinition } from '@kbn/embeddable-plugin/public';
import { type EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { DiscoverDrilldownState } from '../../server';
import type { DiscoverAppLocator } from '../trigger_actions/open_in_discover_helpers';
export type ExecutionContext = ApplyGlobalFilterActionContext & {
    embeddable: LensApi;
};
export type SetupContext = EmbeddableApiContext;
export declare function getDiscoverDrilldown(deps: {
    locator: () => DiscoverAppLocator | undefined;
    dataViews: () => Pick<DataViewsService, 'get'>;
    hasDiscoverAccess: () => boolean;
    application: () => ApplicationStart;
}): DrilldownDefinition<DiscoverDrilldownState, ExecutionContext, SetupContext>;
