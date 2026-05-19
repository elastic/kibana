export type ExternalServiceParams = Record<string, unknown>;
export interface ExternalServiceComment {
    comment: string;
    commentId: string;
}
export interface ExternalServiceIncident {
    incident: ExternalServiceParams;
    comments: ExternalServiceComment[];
}
