export interface CheckPermissionsResponse {
    error?: 'MISSING_SECURITY' | 'MISSING_PRIVILEGES' | 'MISSING_FLEET_SERVER_SETUP_PRIVILEGES';
    success: boolean;
}
export interface GenerateServiceTokenResponse {
    name: string;
    value: string;
}
