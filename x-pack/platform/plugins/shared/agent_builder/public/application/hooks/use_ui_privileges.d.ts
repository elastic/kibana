import { uiPrivileges } from '../../../common/features';
/** UI-facing privileges for Agent Builder (feature-backed + phantom isAdmin). */
export type AgentBuilderUiPrivileges = {
    [K in keyof typeof uiPrivileges]: boolean;
} & {
    /** Phantom capability: true only for wildcard roles (e.g. superuser). Resolved server-side. */
    isAdmin: boolean;
};
export declare const useUiPrivileges: () => AgentBuilderUiPrivileges;
