import type { ApplicationConnectionsAPIClient } from '../service/application_connections_api_client';
export interface ApplicationConnectionsServices {
    apiClient: ApplicationConnectionsAPIClient;
}
export declare const ApplicationConnectionsServicesContext: import("react").Context<ApplicationConnectionsServices | undefined>;
