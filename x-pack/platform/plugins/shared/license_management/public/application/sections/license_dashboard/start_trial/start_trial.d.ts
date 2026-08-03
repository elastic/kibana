import React, { Component } from 'react';
import type { AppDependencies } from '../../../app_context';
import type { TelemetryPluginStart } from '../../../lib/telemetry';
export interface Props {
    loadTrialStatus: () => void;
    startLicenseTrial: () => void;
    telemetry?: TelemetryPluginStart;
    shouldShowStartTrial: boolean;
}
interface State {
    showConfirmation: boolean;
    isOptingInToTelemetry: boolean;
}
export declare class StartTrial extends Component<Props, State> {
    cancelRef: React.RefObject<HTMLButtonElement>;
    confirmRef: React.RefObject<HTMLButtonElement>;
    state: State;
    UNSAFE_componentWillMount(): void;
    onOptInChange: (isOptingInToTelemetry: boolean) => void;
    onStartLicenseTrial: () => void;
    cancel: () => void;
    acknowledgeModal(docLinks: AppDependencies['docLinks']): React.JSX.Element | null;
    render(): React.JSX.Element | null;
}
export {};
