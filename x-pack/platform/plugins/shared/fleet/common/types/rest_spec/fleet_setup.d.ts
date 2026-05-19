export interface PostFleetSetupResponse {
    isInitialized: boolean;
    nonFatalErrors: Array<{
        name: string;
        message: string;
    }>;
}
export interface GetFleetStatusResponse {
    isReady: boolean;
    missing_requirements: Array<'security_required' | 'tls_required' | 'api_keys' | 'fleet_admin_user' | 'fleet_server'>;
    missing_optional_features: Array<'encrypted_saved_object_encryption_key_required'>;
    package_verification_key_id?: string;
    is_space_awareness_enabled?: boolean;
    is_secrets_storage_enabled?: boolean;
    is_ssl_secrets_storage_enabled?: boolean;
    is_action_secrets_storage_enabled?: boolean;
}
