import type { Reducer } from 'react';
import React from 'react';
import type { DeserializedProcessorResult, DeserializeResult } from '../deserialize';
import type { Document } from '../types';
export interface TestPipelineData {
    config: {
        documents?: Document[];
        verbose?: boolean;
        selectedDocumentIndex: number;
    };
    testOutputPerProcessor?: DeserializedProcessorResult[];
    isExecutingPipeline?: boolean;
}
type Action = {
    type: 'updateOutputPerProcessor';
    payload: {
        testOutputPerProcessor?: DeserializedProcessorResult[];
        isExecutingPipeline: boolean;
    };
} | {
    type: 'updateConfig';
    payload: {
        config: {
            documents: Document[];
            verbose?: boolean;
        };
    };
} | {
    type: 'updateActiveDocument';
    payload: Pick<TestPipelineData, 'config'>;
} | {
    type: 'updateIsExecutingPipeline';
    payload: Pick<TestPipelineData, 'isExecutingPipeline'>;
} | {
    type: 'reset';
};
export interface TestPipelineContext {
    testPipelineData: TestPipelineData;
    testPipelineDataDispatch: (data: Action) => void;
    updateTestOutputPerProcessor: (documents: Document[] | undefined, processors: DeserializeResult) => void;
}
export declare const useTestPipelineContext: () => TestPipelineContext;
export declare const reducer: Reducer<TestPipelineData, Action>;
export declare const TestPipelineContextProvider: ({ children }: {
    children: React.ReactNode;
}) => React.JSX.Element;
export {};
