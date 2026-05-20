export interface UpdateCustomIntegrationRequest {
    readMeData?: string;
    categories?: string[];
}
export interface UpdateCustomIntegrationResponse {
    id: string;
    result: {
        version: string;
        status: string;
    };
}
