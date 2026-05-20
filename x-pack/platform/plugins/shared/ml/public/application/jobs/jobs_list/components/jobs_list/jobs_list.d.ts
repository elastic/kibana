export class JobsListUI extends React.Component<any, any, any> {
    static getDerivedStateFromProps(props: any): {
        itemIdToExpandedRowMap: any;
        jobsSummaryList: any;
    };
    constructor(props: any);
    state: {
        jobsSummaryList: any;
        itemIdToExpandedRowMap: {};
    };
    mlApi: any;
    onTableChange: ({ page, sort }: {
        page?: {} | undefined;
        sort?: {} | undefined;
    }) => void;
    toggleRow: (item: any) => void;
    getJobIdLink(id: any): any;
    getPageOfJobs(index: any, size: any, sortField: any, sortDirection: any): {
        pageOfItems: any;
        totalItemCount: any;
    };
    render(): React.JSX.Element;
}
export namespace JobsListUI {
    namespace propTypes {
        let jobsSummaryList: PropTypes.Validator<any[]>;
        let fullJobsList: PropTypes.Validator<object>;
        let isMlEnabledInSpace: PropTypes.Requireable<boolean>;
        let itemIdToExpandedRowMap: PropTypes.Validator<object>;
        let toggleRow: PropTypes.Validator<(...args: any[]) => any>;
        let selectJobChange: PropTypes.Validator<(...args: any[]) => any>;
        let showEditJobFlyout: PropTypes.Requireable<(...args: any[]) => any>;
        let showDatafeedChartFlyout: PropTypes.Requireable<(...args: any[]) => any>;
        let showDeleteJobModal: PropTypes.Requireable<(...args: any[]) => any>;
        let showStartDatafeedModal: PropTypes.Requireable<(...args: any[]) => any>;
        let showCloseJobsConfirmModal: PropTypes.Requireable<(...args: any[]) => any>;
        let showCreateAlertFlyout: PropTypes.Requireable<(...args: any[]) => any>;
        let showStopDatafeedsConfirmModal: PropTypes.Requireable<(...args: any[]) => any>;
        let refreshJobs: PropTypes.Requireable<(...args: any[]) => any>;
        let selectedJobsCount: PropTypes.Validator<number>;
        let loading: PropTypes.Requireable<boolean>;
        let jobsViewState: PropTypes.Requireable<object>;
        let onJobsViewStateUpdate: PropTypes.Requireable<(...args: any[]) => any>;
    }
    namespace defaultProps {
        let isMlEnabledInSpace_1: boolean;
        export { isMlEnabledInSpace_1 as isMlEnabledInSpace };
        let loading_1: boolean;
        export { loading_1 as loading };
    }
}
export const JobsList: React.FC<Omit<any, "kibana">>;
import React from 'react';
import type PropTypes from 'prop-types';
