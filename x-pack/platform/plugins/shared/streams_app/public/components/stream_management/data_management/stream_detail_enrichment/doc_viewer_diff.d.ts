import type { DocView } from '@kbn/unified-doc-viewer/types';
import React from 'react';
export declare const DocViewerContext: React.Context<{
    originalSample?: Record<string, unknown>;
}>;
export declare const useDocViewerContext: () => {
    originalSample?: Record<string, unknown>;
};
export declare const DOC_VIEW_DIFF_ID = "doc_view_diff";
export declare const docViewDiff: DocView;
