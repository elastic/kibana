import React from 'react';
import type { Document } from '../../../types';
import type { TestPipelineConfig } from '../test_pipeline_flyout.container';
interface Props {
    handleTestPipeline: (testPipelineConfig: TestPipelineConfig, refreshOutputPerProcessor?: boolean) => Promise<{
        isSuccessful: boolean;
    }>;
    isRunningTest: boolean;
    cachedVerbose?: boolean;
    cachedDocuments: Document[];
    testOutput?: any;
}
export declare const OutputTab: React.FunctionComponent<Props>;
export {};
