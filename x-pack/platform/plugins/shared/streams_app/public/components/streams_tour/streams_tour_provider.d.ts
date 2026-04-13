import React from 'react';
import type { EuiTourState, EuiTourActions, EuiTourStepProps } from '@elastic/eui';
import type { StreamsTourStepId } from './constants';
export type StreamsTourStepProps = Omit<EuiTourStepProps, 'children' | 'anchor'> & {
    stepId: StreamsTourStepId;
};
export interface StreamsTourProviderProps {
    children: React.ReactNode;
}
export interface StreamsTourContextValue {
    tourStepProps: StreamsTourStepProps[];
    actions: EuiTourActions;
    tourState: EuiTourState;
    isCalloutDismissed: boolean;
    dismissCallout: () => void;
    startTour: (streamName?: string) => void;
    tourStreamName: string | null;
    setTourStreamName: (name: string | null) => void;
    getStepPropsByStepId: (stepId: StreamsTourStepId) => StreamsTourStepProps | undefined;
}
export declare function StreamsTourProvider({ children }: StreamsTourProviderProps): React.JSX.Element;
export declare function useStreamsTour(): StreamsTourContextValue;
