import type { default as React } from 'react';
import { Component } from 'react';
import type { Job } from '@kbn/reporting-public';
import type { ListingPropsInternal } from '..';
interface State {
    page: number;
    perPage?: number;
    total: number;
    jobs: Job[];
    selectedJobs: Job[];
    isLoading: boolean;
    showLinks: boolean;
    enableLinks: boolean;
    badLicenseMessage: string;
    selectedJob: undefined | Job;
}
export declare class ReportExportsTable extends Component<ListingPropsInternal, State> {
    private isInitialJobsFetch;
    private licenseSubscription?;
    private mounted?;
    private poller?;
    constructor(props: ListingPropsInternal);
    componentWillUnmount(): void;
    componentDidMount(): void;
    private licenseHandler;
    private onSelectionChange;
    private removeJob;
    private renderDeleteButton;
    private onTableChange;
    private fetchJobs;
    private licenseAllowsToShowThisPage;
    /**
     * Widths like this are not the best, but the auto-layout does not play well with text in links. We can update
     * this with something that works better on all screen sizes. This works for desktop, mobile fallback is provided on a
     * per column basis.
     */
    private readonly tableColumnWidths;
    render(): React.JSX.Element;
}
export { ReportExportsTable as default };
