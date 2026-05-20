import { type LensPublicCallbacks, type LensComponentForwardedProps, type UserMessage } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';
export declare const isLensApi: (api: unknown) => api is LensApi;
export declare function apiHasLensComponentCallbacks(api: unknown): api is LensPublicCallbacks;
export declare function apiHasUserMessages(api: unknown): api is {
    userMessages?: UserMessage[];
};
export declare function apiHasLensComponentProps(api: unknown): api is LensComponentForwardedProps;
export declare function apiHasAbortController(api: unknown): api is {
    abortController: AbortController;
};
export declare function apiHasLastReloadRequestTime(api: unknown): api is {
    lastReloadRequestTime: number;
};
export declare function apiPublishesInlineEditingCapabilities(api: unknown): api is {
    canEditInline: boolean;
};
/**
 * Type guard to check if the parent API (e.g., Dashboard) exposes whether
 * the current user can edit it based on access control settings.
 */
export declare function apiPublishesIsEditableByUser(api: unknown): api is {
    isEditableByUser: boolean;
};
