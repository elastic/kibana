import React, { Component } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { MlApi } from '../application/services/ml_api_service';
interface Props {
    onJobChange: (jobId: string) => void;
    mlJobsService: MlApi['jobs'];
    jobsManagementPath?: string;
    canCreateJobs: boolean;
}
interface State {
    jobId?: string;
    jobIdList?: Array<EuiComboBoxOptionOption<string>>;
}
export declare class AnomalyJobSelector extends Component<Props, State> {
    private _isMounted;
    state: State;
    private _loadJobs;
    componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>): void;
    componentDidMount(): void;
    componentWillUnmount(): void;
    onJobIdSelect: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
    render(): React.JSX.Element;
}
export {};
