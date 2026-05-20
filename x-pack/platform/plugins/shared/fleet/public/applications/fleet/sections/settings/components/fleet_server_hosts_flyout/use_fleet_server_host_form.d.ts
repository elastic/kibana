import type { useRadioInput } from '../../../../hooks';
import type { useComboInput, useInput, useSwitchInput, useSecretInput } from '../../../../hooks';
import type { FleetServerHost } from '../../../../types';
export interface FleetServerHostSSLInputsType {
    nameInput: ReturnType<typeof useInput>;
    hostUrlsInput: ReturnType<typeof useComboInput>;
    isDefaultInput: ReturnType<typeof useSwitchInput>;
    proxyIdInput?: ReturnType<typeof useInput>;
    sslCertificateInput: ReturnType<typeof useInput>;
    sslKeyInput: ReturnType<typeof useInput>;
    sslKeySecretInput: ReturnType<typeof useSecretInput>;
    sslCertificateAuthoritiesInput: ReturnType<typeof useComboInput>;
    sslEsCertificateInput: ReturnType<typeof useInput>;
    sslESKeyInput: ReturnType<typeof useInput>;
    sslESKeySecretInput: ReturnType<typeof useSecretInput>;
    sslEsCertificateAuthoritiesInput: ReturnType<typeof useComboInput>;
    sslClientAuthInput: ReturnType<typeof useRadioInput>;
    sslAgentCertificateInput: ReturnType<typeof useInput>;
    sslAgentKeyInput: ReturnType<typeof useInput>;
    sslAgentKeySecretInput: ReturnType<typeof useSecretInput>;
    sslAgentCertificateAuthoritiesInput: ReturnType<typeof useComboInput>;
}
export declare function validateFleetServerHosts(value: string[]): {
    message: string;
    index: number;
}[] | {
    message: string;
}[] | undefined;
export declare function validateName(value: string): string[] | undefined;
export declare function useFleetServerHostsForm(fleetServerHost: FleetServerHost | undefined, onSuccess: () => void, defaultFleetServerHost?: FleetServerHost): {
    isLoading: boolean;
    isDisabled: boolean;
    submit: () => Promise<void>;
    inputs: FleetServerHostSSLInputsType;
};
