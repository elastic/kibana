import type { FleetProxy } from '../../../types';
export declare function useDeleteProxy(onSuccess: () => void): {
    deleteFleetProxy: (fleetProxy: FleetProxy) => Promise<void>;
};
