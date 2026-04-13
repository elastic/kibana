import React from 'react';
export type StepFieldKey = 'after' | 'fixed_interval';
export type OnStepFieldErrorsChange = (stepPath: string, field: StepFieldKey, errors: string[] | null) => void;
export declare const OnStepFieldErrorsChangeProvider: ({ value, children, }: {
    value: OnStepFieldErrorsChange;
    children: React.ReactNode;
}) => React.FunctionComponentElement<React.ProviderProps<OnStepFieldErrorsChange | null>>;
export declare const useOnStepFieldErrorsChange: () => OnStepFieldErrorsChange | null;
export declare const useDslStepsFlyoutTabErrors: () => {
    onStepFieldErrorsChange: OnStepFieldErrorsChange;
    tabHasErrors: (stepPath: string) => boolean;
    pruneToStepPaths: (stepPaths: string[]) => void;
    reindexErrorsAfterRemoval: (removedIndex: number) => void;
};
