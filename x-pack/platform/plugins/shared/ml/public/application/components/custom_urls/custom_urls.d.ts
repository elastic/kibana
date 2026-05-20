import React, { Component } from 'react';
import type { TimeRange as EsQueryTimeRange } from '@kbn/es-query';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import type { MlUrlConfig } from '@kbn/ml-anomaly-utils';
import type { DashboardService, DashboardItems } from '../../services/dashboard_service';
import type { MlKibanaReactContextValue } from '../../contexts/kibana';
import { type CustomUrlSettings } from './custom_url_editor/utils';
import type { CustomUrlsWrapperProps } from './custom_urls_wrapper';
interface CustomUrlsState {
    customUrls: MlUrlConfig[];
    dashboards: DashboardItems;
    dataViewListItems: DataViewListItem[];
    editorOpen: boolean;
    editorSettings?: CustomUrlSettings;
    supportedFilterFields: string[];
}
interface CustomUrlsProps extends CustomUrlsWrapperProps {
    currentTimeFilter?: EsQueryTimeRange;
    dashboardService: DashboardService;
    isPartialDFAJob?: boolean;
}
export declare class CustomUrls extends Component<CustomUrlsProps, CustomUrlsState> {
    static contextType: React.Context<import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<import("@kbn/core/public").CoreStart>>>;
    context: MlKibanaReactContextValue;
    private toastNotificationService;
    private mlIndexUtils;
    constructor(props: CustomUrlsProps, constructorContext: MlKibanaReactContextValue);
    static getDerivedStateFromProps(props: CustomUrlsProps): {
        job: import("@kbn/ml-data-frame-analytics-utils").DataFrameAnalyticsConfig | import("@elastic/elasticsearch/lib/api/types").MlJob;
        customUrls: MlUrlConfig[];
    };
    componentDidMount(): void;
    editNewCustomUrl: () => void;
    setEditCustomUrl: (customUrl: CustomUrlSettings) => void;
    addNewCustomUrl: () => void;
    onTestButtonClick: () => void;
    closeEditor: () => void;
    renderEditor(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};
