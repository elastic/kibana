import type { TimeRange } from '@kbn/es-query';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { Observable } from 'rxjs';
import type { GetStateType, LensInternalApi, LensRuntimeState, ViewInDiscoverCallbacks } from '@kbn/lens-common';
import type { LensWireAPIConfig } from '@kbn/lens-common-2';
import type { DrilldownsManager, HasDrilldowns } from '@kbn/embeddable-plugin/public';
import type { LensEmbeddableStartServices } from '../types';
/**
 * Initialize APIs used for actions on Lens panels
 * This includes drilldowns, explore data, and more
 */
export declare function initializeActionApi(uuid: string, initialState: LensRuntimeState, getLatestState: GetStateType, parentApi: unknown, searchContextApi: {
    timeRange$: PublishingSubject<TimeRange | undefined>;
}, internalApi: LensInternalApi, services: LensEmbeddableStartServices, drilldownsManager: DrilldownsManager): {
    api: ViewInDiscoverCallbacks & Partial<HasDrilldowns>;
    anyStateChange$: Observable<void>;
    getComparators: () => DrilldownsManager['comparators'];
    getLatestState: () => ReturnType<DrilldownsManager['getLatestState']>;
    cleanup: () => void;
    reinitializeState: (lastSaved?: LensWireAPIConfig) => void;
};
