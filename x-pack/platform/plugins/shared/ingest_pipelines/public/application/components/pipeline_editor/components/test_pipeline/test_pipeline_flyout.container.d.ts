import React from 'react';
import type { DeserializeResult } from '../../deserialize';
import type { Document } from '../../types';
import type { TestPipelineFlyoutTab } from './test_pipeline_tabs';
export interface Props {
    activeTab: TestPipelineFlyoutTab;
    setActiveTab: (tab: TestPipelineFlyoutTab) => void;
    onClose: () => void;
    processors: DeserializeResult;
}
export interface TestPipelineConfig {
    documents: Document[];
    verbose?: boolean;
}
export interface TestPipelineFlyoutForm {
    documents: string | Document[];
}
export declare const TestPipelineFlyout: React.FunctionComponent<Props>;
