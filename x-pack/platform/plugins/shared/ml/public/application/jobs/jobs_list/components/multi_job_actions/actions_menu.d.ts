export const MultiJobActionsMenu: typeof MultiJobActionsMenuUI;
declare class MultiJobActionsMenuUI extends React.Component<any, any, any> {
    static contextType: React.Context<import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<import("@kbn/core/public").CoreStart>>>;
    constructor(props: any, constructorContext: any);
    state: {
        isOpen: boolean;
    };
    canDeleteJob: boolean;
    canStartStopDatafeed: boolean;
    canCloseJob: boolean;
    canResetJob: boolean;
    canCreateMlAlerts: boolean;
    toastNotifications: any;
    mlApi: any;
    onButtonClick: () => void;
    closePopover: () => void;
    render(): React.JSX.Element;
}
declare namespace MultiJobActionsMenuUI {
    namespace propTypes {
        let jobs: PropTypes.Validator<any[]>;
        let showStartDatafeedModal: PropTypes.Validator<(...args: any[]) => any>;
        let showDeleteJobModal: PropTypes.Validator<(...args: any[]) => any>;
        let showStopDatafeedsConfirmModal: PropTypes.Validator<(...args: any[]) => any>;
        let refreshJobs: PropTypes.Validator<(...args: any[]) => any>;
        let showCreateAlertFlyout: PropTypes.Validator<(...args: any[]) => any>;
    }
}
import React from 'react';
import type PropTypes from 'prop-types';
export {};
