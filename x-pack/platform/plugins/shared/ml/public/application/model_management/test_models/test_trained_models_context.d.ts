import type { Dispatch } from 'react';
import type { estypes } from '@elastic/elasticsearch';
export interface TestTrainedModelsContextType {
    pipelineConfig?: estypes.IngestPipeline;
    createPipelineFlyoutOpen: boolean;
    defaultSelectedDataViewId?: string;
}
export declare const TestTrainedModelsContext: import("react").Context<{
    currentContext: TestTrainedModelsContextType;
    setCurrentContext: Dispatch<TestTrainedModelsContextType>;
} | undefined>;
export declare function useTestTrainedModelsContext(): {
    currentContext: TestTrainedModelsContextType;
    setCurrentContext: Dispatch<TestTrainedModelsContextType>;
};
