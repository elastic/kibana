import type { FunctionComponent } from 'react';
import type { Document } from '../../../types';
import type { TestPipelineFlyoutTab } from '../test_pipeline_tabs';
interface Props {
    documents: Document[];
    selectedDocumentIndex: number;
    updateSelectedDocument: (index: number) => void;
    openFlyout: (activeFlyoutTab: TestPipelineFlyoutTab) => void;
}
export declare const DocumentsDropdown: FunctionComponent<Props>;
export {};
