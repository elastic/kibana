export class JobsListViewUI extends React.Component<any, any, any> {
    constructor(props: any);
    state: {
        isRefreshing: boolean;
        loading: null;
        jobsSummaryList: never[];
        filteredJobsSummaryList: never[];
        fullJobsList: {};
        selectedJobs: never[];
        itemIdToExpandedRowMap: {};
        filterClauses: never[];
        blockingJobIds: never[];
        blockingJobsFirstFoundMs: null;
        jobsAwaitingNodeCount: number;
    };
    updateFunctions: {};
    showEditJobFlyout: () => void;
    showDatafeedChartFlyout: () => void;
    showStopDatafeedsConfirmModal: () => void;
    showCloseJobsConfirmModal: () => void;
    showDeleteJobModal: () => void;
    showResetJobModal: () => void;
    showStartDatafeedModal: () => void;
    showCreateAlertFlyout: () => void;
    _isMounted: boolean;
    /**
     * Indicates if the filters has been initialized by {@link JobFilterBar} component
     * @type {boolean}
     * @internal
     */
    _isFiltersSet: boolean;
    componentDidMount(): void;
    componentDidUpdate(prevProps: any): void;
    componentWillUnmount(): void;
    openAutoStartDatafeedModal(): void;
    toggleRow: (jobId: any) => void;
    addUpdateFunction: (id: any, f: any) => void;
    removeUpdateFunction: (id: any) => void;
    setShowEditJobFlyoutFunction: (func: any) => void;
    unsetShowEditJobFlyoutFunction: () => void;
    setShowDatafeedChartFlyoutFunction: (func: any) => void;
    unsetShowDatafeedChartFlyoutFunction: () => void;
    setShowStopDatafeedsConfirmModalFunction: (func: any) => void;
    unsetShowStopDatafeedsConfirmModalFunction: () => void;
    setShowCloseJobsConfirmModalFunction: (func: any) => void;
    unsetShowCloseJobsConfirmModalFunction: () => void;
    setShowDeleteJobModalFunction: (func: any) => void;
    unsetShowDeleteJobModalFunction: () => void;
    setShowResetJobModalFunction: (func: any) => void;
    unsetShowResetJobModalFunction: () => void;
    setShowStartDatafeedModalFunction: (func: any) => void;
    unsetShowStartDatafeedModalFunction: () => void;
    setShowCreateAlertFlyoutFunction: (func: any) => void;
    unsetShowCreateAlertFlyoutFunction: () => void;
    getShowCreateAlertFlyoutFunction: () => () => void;
    selectJobChange: (selectedJobs: any) => void;
    refreshSelectedJobs(): void;
    setFilters: (query: any) => Promise<void>;
    onRefreshClick: () => void;
    isDoneRefreshing: () => void;
    refreshJobSummaryList(): Promise<void>;
    checkBlockingJobTasks(forceRefresh?: boolean): Promise<void>;
    getBlockedJobsRefreshInterval(): 2000 | 120000;
    refreshJobs: () => void;
    renderJobsListComponents(): React.JSX.Element;
    render(): React.JSX.Element;
}
export namespace JobsListViewUI {
    namespace propTypes {
        let euiTheme: PropTypes.Validator<object>;
    }
}
export const JobsListView: React.FC<Omit<any, "kibana">>;
import React from 'react';
import PropTypes from 'prop-types';
