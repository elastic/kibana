import { type LensPublicCallbacks, type LensComponentForwardedProps, type UserMessage } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { ReactExpressionRendererProps } from '@kbn/expressions-plugin/public';
export type OnDataCallback = NonNullable<ReactExpressionRendererProps['onData$']>;
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
/**
 * Best-effort type guard to check if adapters is a Partial<DefaultInspectorAdapters>.
 * Validates that the object only contains known adapter properties.
 * Not a perfect check, but necessary due to generic typing constraints
 * in the current codebase where adapters can be typed as `unknown`.
 */
export declare function isPartialInspectorAdapters(adapters: unknown): adapters is Partial<DefaultInspectorAdapters>;
/**
 * Best-effort type guard to check if adapters has a requests property.
 * Not a perfect check, but necessary due to generic typing constraints
 * in the current codebase where adapters can be typed as `unknown`.
 */
export declare function hasRequestsAdapter(adapters: unknown): adapters is DefaultInspectorAdapters;
/**
 * Best-effort type guard to check if adapters has a tables property.
 * Not a perfect check, but necessary due to generic typing constraints
 * in the current codebase where adapters can be typed as `unknown`.
 */
export declare function hasTablesAdapter(adapters: unknown): adapters is DefaultInspectorAdapters;
