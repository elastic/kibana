export declare enum OAuthClientType {
    PUBLIC = "public",
    CONFIDENTIAL = "confidential"
}
export interface OAuthClientLogo {
    media_type: string;
    data: string;
}
export interface OAuthClientConnectionsSummary {
    active?: string[];
    revoked?: string[];
}
export interface OAuthClient {
    id: string;
    client_name?: string;
    resource: string;
    type?: OAuthClientType;
    creation?: string;
    revoked?: boolean;
    revocation?: string;
    revocation_reason?: string;
    client_metadata?: Record<string, string>;
    client_logo?: OAuthClientLogo;
    redirect_uris?: string[];
    connections?: OAuthClientConnectionsSummary;
}
