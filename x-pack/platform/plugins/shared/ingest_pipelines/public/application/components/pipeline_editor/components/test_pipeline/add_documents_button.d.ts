import type { FunctionComponent } from 'react';
import type { TestPipelineFlyoutTab } from './test_pipeline_tabs';
interface Props {
    openFlyout: (activeFlyoutTab: TestPipelineFlyoutTab) => void;
}
export declare const AddDocumentsButton: FunctionComponent<Props>;
export {};
