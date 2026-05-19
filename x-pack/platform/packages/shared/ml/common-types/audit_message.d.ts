export interface AuditMessageBase {
    message: string;
    level: string;
    timestamp: number;
    node_name: string;
    text?: string;
    cleared?: boolean;
}
export interface JobMessage extends AuditMessageBase {
    job_id: string;
    clearable?: boolean;
}
