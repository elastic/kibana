export class JobDetailsUI extends React.Component<any, any, any> {
    constructor(props: any);
    state: {
        datafeedChartFlyoutVisible: boolean;
        modelSnapshot: null;
        revertSnapshotFlyoutVisible: boolean;
    };
    componentWillUnmount(): void;
    updateJob(job: any): void;
    render(): React.JSX.Element;
}
export namespace JobDetailsUI {
    namespace propTypes {
        let jobId: PropTypes.Validator<string>;
        let job: PropTypes.Requireable<object>;
        let addYourself: PropTypes.Validator<(...args: any[]) => any>;
        let removeYourself: PropTypes.Validator<(...args: any[]) => any>;
        let refreshJobList: PropTypes.Requireable<(...args: any[]) => any>;
    }
}
export const JobDetails: React.FC<Omit<any, "kibana">>;
import React from 'react';
import type PropTypes from 'prop-types';
