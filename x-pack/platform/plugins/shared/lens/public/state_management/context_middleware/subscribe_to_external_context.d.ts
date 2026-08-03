import type { LensAppServices } from '@kbn/lens-common';
import type { LensGetState, LensDispatch } from '..';
/**
 * subscribes to external changes for filters, searchSessionId, timerange, autorefresh and projectRouting
 */
export declare function subscribeToExternalContext({ data, cps }: LensAppServices, getState: LensGetState, dispatch: LensDispatch): () => void;
