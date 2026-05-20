export class StartDatafeedModal extends React.Component<any, any, any> {
    static contextType: React.Context<import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<import("@kbn/core/public").CoreStart>>>;
    constructor(props: any, constructorContext: any);
    state: {
        jobs: any;
        isModalVisible: boolean;
        startTime: moment.Moment;
        endTime: moment.Moment;
        createAlert: boolean;
        allowCreateAlert: boolean;
        initialSpecifiedStartTime: moment.Moment;
        now: moment.Moment;
        timeRangeValid: boolean;
        hasManagedJob: boolean;
    };
    initialSpecifiedStartTime: moment.Moment;
    refreshJobs: any;
    getShowCreateAlertFlyoutFunction: any;
    toastNotifications: any;
    mlApi: any;
    componentDidMount(): void;
    componentWillUnmount(): void;
    setStartTime: (time: any) => void;
    setEndTime: (time: any) => void;
    setCreateAlert: (e: any) => void;
    closeModal: () => void;
    setTimeRangeValid: (timeRangeValid: any) => void;
    showModal: (jobs: any, showCreateAlertFlyout: any) => void;
    save: () => void;
    render(): React.JSX.Element;
}
export namespace StartDatafeedModal {
    namespace propTypes {
        let setShowFunction: PropTypes.Validator<(...args: any[]) => any>;
        let unsetShowFunction: PropTypes.Validator<(...args: any[]) => any>;
        let refreshJobs: PropTypes.Validator<(...args: any[]) => any>;
    }
}
import React from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
