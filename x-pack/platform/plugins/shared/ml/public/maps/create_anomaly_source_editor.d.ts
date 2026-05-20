import React, { Component } from 'react';
import type { AnomalySourceDescriptor } from './anomaly_source';
import type { MlAnomalyLayersType } from './util';
import type { MlApi } from '../application/services/ml_api_service';
interface Props {
    onSourceConfigChange: (sourceConfig: Partial<AnomalySourceDescriptor> | null) => void;
    mlJobsService: MlApi['jobs'];
    jobsManagementPath?: string;
    canCreateJobs: boolean;
}
interface State {
    jobId?: string;
    typicalActual?: MlAnomalyLayersType;
}
export declare class CreateAnomalySourceEditor extends Component<Props, State> {
    private _isMounted;
    state: State;
    private configChange;
    componentDidMount(): void;
    private onTypicalActualChange;
    private previewLayer;
    render(): React.JSX.Element;
}
export {};
