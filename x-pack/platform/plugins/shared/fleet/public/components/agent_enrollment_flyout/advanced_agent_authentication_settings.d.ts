import type { FunctionComponent } from 'react';
interface Props {
    agentPolicyId?: string;
    selectedApiKeyId?: string;
    initialAuthenticationSettingsOpen?: boolean;
    onKeyChange: (key?: string) => void;
}
export declare const AdvancedAgentAuthenticationSettings: FunctionComponent<Props>;
export {};
