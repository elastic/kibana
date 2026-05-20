export class GroupSelectorUI extends React.Component<any, any, any> {
    static propTypes: {
        jobs: PropTypes.Validator<any[]>;
        allJobIds: PropTypes.Validator<any[]>;
        refreshJobs: PropTypes.Validator<(...args: any[]) => any>;
    };
    static getDerivedStateFromProps(props: any, state: any): {
        selectedGroups: any;
    } | {
        selectedGroups?: undefined;
    };
    constructor(props: any, constructorContext: any);
    state: {
        isPopoverOpen: boolean;
        groups: never[];
        selectedGroups: {};
        edited: boolean;
    };
    refreshJobs: any;
    canUpdateJob: boolean;
    toastNotificationsService: {
        displayDangerToast: (toastOrTitle: import("@kbn/core/public").ToastInput, options?: import("@kbn/core/public").ToastOptions) => void;
        displayWarningToast: (toastOrTitle: import("@kbn/core/public").ToastInput, options?: import("@kbn/core/public").ToastOptions) => void;
        displaySuccessToast: (toastOrTitle: import("@kbn/core/public").ToastInput, options?: import("@kbn/core/public").ToastOptions) => void;
        displayErrorToast: (error: import("@kbn/ml-error-utils").ErrorType, title?: string, toastLifeTimeMs?: number, toastMessage?: string) => void;
    };
    togglePopover: () => void;
    closePopover: () => void;
    selectGroup: (group: any) => void;
    applyChanges: () => void;
    addNewGroup: (id: any) => void;
    render(): React.JSX.Element;
}
export const GroupSelector: React.FC<Omit<any, "kibana">>;
import React from 'react';
import PropTypes from 'prop-types';
