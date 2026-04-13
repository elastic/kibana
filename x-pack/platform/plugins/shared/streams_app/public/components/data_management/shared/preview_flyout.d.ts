import React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import type { DataView } from '@kbn/data-views-plugin/common';
export declare const FLYOUT_WIDTH_KEY = "streamsEnrichment:flyoutWidth";
export interface DataTableRecordWithIndex extends DataTableRecord {
    index: number;
}
export declare const PreviewFlyout: ({ currentDoc, hits, setExpandedDoc, docViewsRegistry, streamName, streamDataView, }: {
    currentDoc?: DataTableRecordWithIndex;
    hits: DataTableRecordWithIndex[];
    setExpandedDoc: (doc?: DataTableRecordWithIndex) => void;
    docViewsRegistry: DocViewsRegistry;
    streamName: string;
    streamDataView?: DataView;
}) => React.JSX.Element | undefined;
