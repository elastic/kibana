import React from 'react';
interface ProcessorContextValue {
    processorId: string;
}
export declare const ProcessorContextProvider: React.FC<React.PropsWithChildren<ProcessorContextValue>>;
export declare const useProcessorContext: () => ProcessorContextValue | null;
export {};
