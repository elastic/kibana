import React from 'react';
import type { ReportingAPIClient } from '@kbn/reporting-public';
import type { ReportingSharingData } from '@kbn/reporting-public/share/share_context_menu';
import type { ReportingPublicPluginStartDependencies } from '../../plugin';
export interface ScheduledReportMenuItem {
    apiClient: ReportingAPIClient;
    services: ReportingPublicPluginStartDependencies;
    sharingData: ReportingSharingData;
    onClose: () => void;
}
export declare const ScheduledReportFlyoutShareWrapper: ({ apiClient, services: reportingServices, sharingData, onClose, }: ScheduledReportMenuItem) => React.JSX.Element | null;
