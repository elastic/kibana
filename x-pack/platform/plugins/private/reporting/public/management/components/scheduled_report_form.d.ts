import React from 'react';
import type { ReportTypeData, ScheduledReport } from '../../types';
export type FormData = Pick<ScheduledReport, 'title' | 'reportTypeId' | 'startDate' | 'timezone' | 'recurring' | 'recurringSchedule' | 'sendByEmail' | 'emailRecipients' | 'emailCcRecipients' | 'emailBccRecipients' | 'emailSubject' | 'emailMessage' | 'optimizedForPrinting'>;
export interface ScheduledReportFormProps {
    scheduledReport: Partial<ScheduledReport>;
    availableReportTypes?: ReportTypeData[];
    onClose: () => void;
    onSubmitForm?: (params: FormData) => Promise<void>;
    isSubmitLoading?: boolean;
    editMode?: boolean;
    readOnly?: boolean;
}
export declare const ScheduledReportForm: ({ onSubmitForm, isSubmitLoading, scheduledReport, availableReportTypes, onClose, editMode, readOnly, }: ScheduledReportFormProps) => React.JSX.Element;
