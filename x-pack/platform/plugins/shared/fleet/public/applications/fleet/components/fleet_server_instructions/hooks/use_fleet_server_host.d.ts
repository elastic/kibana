import type { FleetServerHost } from '../../../types';
import type { FleetServerHostSSLInputsType } from '../../../sections/settings/components/fleet_server_hosts_flyout/use_fleet_server_host_form';
export interface FleetServerHostForm {
    fleetServerHosts: FleetServerHost[];
    handleSubmitForm: () => Promise<FleetServerHost | undefined>;
    isFleetServerHostSubmitted: boolean;
    fleetServerHost?: FleetServerHost | null;
    setFleetServerHost: React.Dispatch<React.SetStateAction<FleetServerHost | undefined | null>>;
    error?: string;
    inputs: FleetServerHostSSLInputsType;
}
export declare const useFleetServerHost: () => FleetServerHostForm;
