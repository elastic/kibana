export class EditJobFlyoutUI extends React.Component<any, any, any> {
    constructor(props: any, constructorContext: any);
    _initialJobFormState: null;
    state: {
        job: {};
        hasDatafeed: boolean;
        datafeedRunning: boolean;
        isFlyoutVisible: boolean;
        isConfirmationModalVisible: boolean;
        jobDescription: string;
        jobGroups: never[];
        jobModelMemoryLimit: string;
        jobModelSnapshotRetentionDays: number;
        jobDailyModelSnapshotRetentionAfterDays: number;
        jobDetectors: never[];
        jobDetectorDescriptions: never[];
        jobCustomUrls: never[];
        datafeedQuery: string;
        datafeedQueryDelay: string;
        datafeedFrequency: string;
        datafeedScrollSize: string;
        jobModelMemoryLimitValidationError: string;
        jobGroupsValidationError: string;
        isValidJobDetails: boolean;
        isValidJobCustomUrls: boolean;
        modelMemoryEstimation: undefined;
    };
    refreshJobs: any;
    componentDidMount(): void;
    componentWillUnmount(): void;
    closeFlyout: (isConfirmed?: boolean) => void;
    /**
     * Checks if there are any unsaved changes.
     * @returns {boolean}
     */
    containsUnsavedChanges(): boolean;
    showFlyout: (jobLite: any) => void;
    extractInitialJobFormState(job: any, hasDatafeed: any): void;
    extractJob(job: any, hasDatafeed: any): void;
    setJobDetails: (jobDetails: any) => void;
    setDetectorDescriptions: (jobDetectorDescriptions: any) => void;
    setDatafeed: (datafeed: any) => void;
    setCustomUrls: (jobCustomUrls: any) => void;
    save: () => void;
    estimateModelMemoryLimit(payload: any): Promise<void>;
    render(): React.JSX.Element;
}
export namespace EditJobFlyoutUI {
    namespace propTypes {
        let euiTheme: PropTypes.Validator<object>;
        let setShowFunction: PropTypes.Validator<(...args: any[]) => any>;
        let unsetShowFunction: PropTypes.Validator<(...args: any[]) => any>;
        let refreshJobs: PropTypes.Validator<(...args: any[]) => any>;
        let allJobIds: PropTypes.Validator<any[]>;
    }
}
export const EditJobFlyout: React.FC<Omit<any, "kibana">>;
import React from 'react';
import type PropTypes from 'prop-types';
