import React from 'react';
import type { AttachSavedObjectModalProps } from './attach_saved_object_modal';
/**
 * Lazy entry point for the attach-saved-object modal. Owns the Suspense
 * boundary and renders a modal-shaped loading state while the chunk loads so
 * callers can just render `<AttachSavedObjectModalLazy ... />` without
 * having to know about the lazy boundary.
 */
export declare const AttachSavedObjectModalLazy: React.FC<AttachSavedObjectModalProps>;
