import React from 'react';
import type { ReportingAPIClient } from '@kbn/reporting-public';
import type { ReportingSharingData } from '@kbn/reporting-public/share/share_context_menu';
import type { ReportTypeData, ScheduledReport } from '../../types';
export interface CreateScheduledReportFormProps {
    apiClient: ReportingAPIClient;
    objectType?: string;
    sharingData?: ReportingSharingData;
    scheduledReport: Partial<ScheduledReport>;
    availableReportTypes: ReportTypeData[];
    onClose: () => void;
}
export declare const CreateScheduledReportForm: ({ apiClient, objectType, sharingData, scheduledReport, availableReportTypes, onClose, }: CreateScheduledReportFormProps) => React.JSX.Element;
