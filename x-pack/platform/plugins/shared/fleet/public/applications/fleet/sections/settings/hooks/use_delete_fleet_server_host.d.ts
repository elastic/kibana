import type { FleetServerHost } from '../../../types';
export declare function useDeleteFleetServerHost(onSuccess: () => void): {
    deleteFleetServerHost: (fleetServerHost: FleetServerHost) => Promise<void>;
};
