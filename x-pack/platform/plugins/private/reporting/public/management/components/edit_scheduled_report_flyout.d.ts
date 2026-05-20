import React from 'react';
import type { ReportTypeData, ScheduledReport } from '../../types';
export interface ScheduledReportFlyoutProps {
    scheduledReport: Partial<ScheduledReport>;
    availableReportTypes: ReportTypeData[];
    onClose: () => void;
}
export declare const EditScheduledReportFlyout: ({ scheduledReport, availableReportTypes, onClose, }: ScheduledReportFlyoutProps) => React.JSX.Element;
