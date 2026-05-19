import type { LoginLayout } from '@kbn/security-plugin-types-common';
export interface LoginSelectorProvider {
    type: string;
    name: string;
    usesLoginForm: boolean;
    showInSelector: boolean;
    description?: string;
    hint?: string;
    icon?: string;
    origin?: string | string[];
}
export interface LoginSelector {
    enabled: boolean;
    providers: LoginSelectorProvider[];
}
export interface LoginState {
    layout: LoginLayout;
    allowLogin: boolean;
    requiresSecureConnection: boolean;
    loginHelp?: string;
    selector: LoginSelector;
}
