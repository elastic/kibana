export interface ConfigType {
    loginAssistanceMessage: string;
    showInsecureClusterWarning: boolean;
    sameSiteCookies: 'Strict' | 'Lax' | 'None' | undefined;
    ui: {
        userManagementEnabled: boolean;
        roleMappingManagementEnabled: boolean;
    };
    roleManagementEnabled: boolean | undefined;
    uiam?: {
        enabled: boolean;
    };
}
