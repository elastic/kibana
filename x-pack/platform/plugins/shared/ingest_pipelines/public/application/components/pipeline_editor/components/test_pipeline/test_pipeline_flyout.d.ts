import React from 'react';
import type { FormHook } from '../../../../../shared_imports';
import type { Document } from '../../types';
import type { TestPipelineFlyoutTab } from './test_pipeline_tabs';
import type { TestPipelineFlyoutForm } from './test_pipeline_flyout.container';
export interface Props {
    onClose: () => void;
    handleTestPipeline: (testPipelineConfig: TestPipelineConfig, refreshOutputPerProcessor?: boolean) => Promise<{
        isSuccessful: boolean;
    }>;
    isRunningTest: boolean;
    cachedVerbose?: boolean;
    cachedDocuments?: Document[];
    testOutput?: any;
    form: FormHook<TestPipelineFlyoutForm>;
    validateAndTestPipeline: () => Promise<void>;
    selectedTab: TestPipelineFlyoutTab;
    setSelectedTab: (selectedTa: TestPipelineFlyoutTab) => void;
    testingError: any;
    resetTestOutput: () => void;
}
export interface TestPipelineConfig {
    documents: Document[];
    verbose?: boolean;
}
export declare const TestPipelineFlyout: React.FunctionComponent<Props>;
