import React from 'react';
import type { TelemetryPluginStart } from '../../lib/telemetry';
interface State {
    showMoreTelemetryInfo: boolean;
    showExample: boolean;
}
interface Props {
    onOptInChange: (isOptingInToTelemetry: boolean) => void;
    isOptingInToTelemetry: boolean;
    isStartTrial: boolean;
    telemetry: TelemetryPluginStart;
}
export declare class TelemetryOptIn extends React.Component<Props, State> {
    state: State;
    closeReadMorePopover: () => void;
    onClickReadMore: () => void;
    onClickExample: () => void;
    onChangeOptIn: (event: React.ChangeEvent<HTMLInputElement>) => void;
    render(): React.JSX.Element;
}
export {};
