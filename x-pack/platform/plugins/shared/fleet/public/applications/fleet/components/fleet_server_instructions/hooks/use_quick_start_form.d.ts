import type { useComboInput, useInput, useSwitchInput } from '../../../hooks';
import type { FleetServerHost } from '../../../types';
export type QuickStartCreateFormStatus = 'initial' | 'loading' | 'error' | 'success';
export interface QuickStartCreateForm {
    status: QuickStartCreateFormStatus;
    fleetServerHosts: FleetServerHost[];
    error?: string;
    submit: () => void;
    setFleetServerHost: React.Dispatch<React.SetStateAction<FleetServerHost | undefined | null>>;
    fleetServerHost?: FleetServerHost | null;
    isFleetServerHostSubmitted: boolean;
    fleetServerPolicyId?: string;
    serviceToken?: string;
    inputs: {
        hostUrlsInput: ReturnType<typeof useComboInput>;
        nameInput: ReturnType<typeof useInput>;
        isDefaultInput: ReturnType<typeof useSwitchInput>;
    };
    onClose?: () => void;
}
/**
 * Provides a unified interface that combines the following operations:
 * 1. Setting a Fleet Server host in Fleet's settings
 * 2. Creating an agent policy that contains the `fleet_server` integration
 * 3. Generating a service token used by Fleet Server
 */
export declare const useQuickStartCreateForm: () => QuickStartCreateForm;
