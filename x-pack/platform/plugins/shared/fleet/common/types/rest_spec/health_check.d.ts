export interface PostHealthCheckRequest {
    body: {
        id: string;
    };
}
export interface PostHealthCheckResponse {
    host_id: string;
    status: string;
}
