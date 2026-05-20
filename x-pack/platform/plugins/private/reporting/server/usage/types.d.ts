export interface ReportingUsage {
    has_errors: boolean;
    error_messages?: string[];
    number_of_scheduled_reports: number;
    number_of_enabled_scheduled_reports: number;
    number_of_scheduled_reports_by_type: Record<string, number>;
    number_of_enabled_scheduled_reports_by_type: Record<string, number>;
    number_of_scheduled_reports_with_notifications: number;
}
