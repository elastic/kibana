import type { MiddlewareAPI } from '@reduxjs/toolkit';
import type { History } from 'history';
import type { LensStoreDeps, SharingSavedObjectProps, LensAppServices, LensDocument, LensSerializedState } from '@kbn/lens-common';
import { type InitialAppState } from '../lens_slice';
interface PersistedDoc {
    doc: LensDocument;
    sharingSavedObjectProps: Omit<SharingSavedObjectProps, 'sourceId'>;
    managed: boolean;
}
/**
 * This function returns a Saved object from a either a by reference or by value input
 */
export declare const getFromPreloaded: ({ initialInput, lensServices, history, }: {
    initialInput: LensSerializedState;
    lensServices: Pick<LensAppServices, "attributeService" | "notifications" | "spaces" | "http">;
    history?: History<unknown>;
}) => Promise<PersistedDoc | undefined>;
export declare function loadInitial(store: MiddlewareAPI, storeDeps: LensStoreDeps, { redirectCallback, initialInput, history, inlineEditing, hideTextBasedEditor }: InitialAppState, autoApplyDisabled: boolean): Promise<void>;
export {};
