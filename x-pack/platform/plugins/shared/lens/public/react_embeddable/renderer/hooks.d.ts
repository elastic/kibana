import type { LensInternalApi } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';
/**
 * This hooks known how to extract message based on types for the UI
 */
export declare function useMessages({ messages$ }: LensInternalApi): [import("@kbn/lens-common").UserMessage[], import("@kbn/lens-common").UserMessage[]];
/**
 * This hook is responsible to emit the render start/complete JS event
 * The render error is handled by the data_loader itself when updating the blocking errors
 */
export declare function useDispatcher(hasRendered: boolean, api: LensApi): import("react").MutableRefObject<HTMLDivElement | null>;
