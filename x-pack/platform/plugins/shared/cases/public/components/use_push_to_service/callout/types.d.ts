export interface ErrorMessage {
    description: JSX.Element | string;
    errorType?: 'primary' | 'success' | 'warning' | 'danger';
    id: string;
    title: string;
}
export declare const CLOSED_CASE_PUSH_ERROR_ID = "closed-case-push-error";
