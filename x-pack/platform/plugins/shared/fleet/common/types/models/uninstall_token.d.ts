export interface UninstallToken {
    id: string;
    policy_id: string;
    policy_name: string | null;
    token: string;
    created_at: string;
    namespaces?: string[];
}
export type UninstallTokenMetadata = Omit<UninstallToken, 'token'>;
