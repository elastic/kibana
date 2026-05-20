import React, { PureComponent } from 'react';
import type { Job } from '@kbn/reporting-public';
type DeleteFn = () => Promise<void>;
interface Props {
    jobsToDelete: Job[];
    performDelete: DeleteFn;
}
interface State {
    isDeleting: boolean;
    showConfirm: boolean;
}
export declare class ReportDeleteButton extends PureComponent<Props, State> {
    constructor(props: Props);
    private hideConfirm;
    private showConfirm;
    private performDelete;
    private renderConfirm;
    render(): React.JSX.Element | null;
}
export {};
