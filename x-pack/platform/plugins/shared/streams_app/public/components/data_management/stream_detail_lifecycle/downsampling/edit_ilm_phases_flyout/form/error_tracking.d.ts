import React from 'react';
import type { PhaseName } from '@kbn/streams-schema';
import type { IlmPhasesFlyoutFormInternal } from './types';
export type OnFieldErrorsChange = (path: string, errors: string[] | null) => void;
export declare const OnFieldErrorsChangeProvider: ({ value, children, }: {
    value: OnFieldErrorsChange;
    children: React.ReactNode;
}) => React.FunctionComponentElement<React.ProviderProps<OnFieldErrorsChange | null>>;
export declare const useOnFieldErrorsChange: () => OnFieldErrorsChange | null;
export declare const useIlmPhasesFlyoutTabErrors: (formData: IlmPhasesFlyoutFormInternal | undefined) => {
    onFieldErrorsChange: OnFieldErrorsChange;
    tabHasErrors: (phaseName: PhaseName) => boolean;
};
