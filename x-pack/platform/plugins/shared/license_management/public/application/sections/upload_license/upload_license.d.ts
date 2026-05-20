import React from 'react';
import type { ScopedHistory } from '@kbn/core/public';
import type { History } from 'history';
import type { TelemetryPluginStart } from '../../lib/telemetry';
import type { UploadStatusState } from '../../store/types';
export interface Props {
    currentLicenseType: string;
    applying: boolean;
    needsAcknowledgement: boolean;
    messages?: Array<string | string[]>;
    errorMessage: string;
    isInvalid: boolean;
    telemetry?: TelemetryPluginStart;
    history: ScopedHistory | History;
    setBreadcrumb: (section: 'dashboard' | 'upload') => void;
    addUploadErrorMessage: (message: string | React.ReactNode) => void;
    uploadLicense: (license: string, currentType: string, acknowledge?: boolean) => void;
    uploadLicenseStatus: (status: UploadStatusState) => void;
}
interface State {
    isOptingInToTelemetry: boolean;
}
export declare class UploadLicense extends React.PureComponent<Props, State> {
    private file;
    state: State;
    componentDidMount(): void;
    onOptInChange: (isOptingInToTelemetry: boolean) => void;
    send: (acknowledge?: boolean) => void;
    cancel: () => void;
    acknowledgeModal(): React.JSX.Element | null;
    errorMessage(): string[] | null;
    handleFile: (files: FileList | null) => void;
    submit: (event: React.FormEvent) => void;
    render(): React.JSX.Element;
}
export {};
