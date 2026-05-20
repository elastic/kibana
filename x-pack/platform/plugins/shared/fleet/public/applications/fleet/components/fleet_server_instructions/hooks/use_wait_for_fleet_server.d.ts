/**
 * Polls the Fleet status endpoint until the `fleet_server` requirement does not appear
 * in the `missing_requirements` list.
 */
export declare const useWaitForFleetServer: () => {
    isFleetServerReady: boolean;
};
