export class MultiJobActions extends React.Component<any, any, any> {
    constructor(props: any);
    state: {};
    render(): React.JSX.Element;
}
export namespace MultiJobActions {
    namespace propTypes {
        let selectedJobs: PropTypes.Validator<any[]>;
        let allJobIds: PropTypes.Validator<any[]>;
        let showStartDatafeedModal: PropTypes.Validator<(...args: any[]) => any>;
        let showCloseJobsConfirmModal: PropTypes.Validator<(...args: any[]) => any>;
        let showDeleteJobModal: PropTypes.Validator<(...args: any[]) => any>;
        let showResetJobModal: PropTypes.Validator<(...args: any[]) => any>;
        let showStopDatafeedsConfirmModal: PropTypes.Validator<(...args: any[]) => any>;
        let refreshJobs: PropTypes.Validator<(...args: any[]) => any>;
        let showCreateAlertFlyout: PropTypes.Validator<(...args: any[]) => any>;
    }
}
import React from 'react';
import PropTypes from 'prop-types';
