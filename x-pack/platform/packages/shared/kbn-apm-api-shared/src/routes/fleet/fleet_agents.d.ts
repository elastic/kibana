export interface FleetAgentResponse {
    cloudStandaloneSetup: {
        apmServerUrl: string | undefined;
        secretToken: string | undefined;
    } | undefined;
    isFleetEnabled: boolean;
    fleetAgents: Array<{
        id: string;
        name: string;
        apmServerUrl: any;
        secretToken: any;
    }>;
}
export declare const fleetAgentsRoute: {
    endpoint: "GET /internal/apm/fleet/agents";
    params?: undefined;
} & import("../types").WithResponse<FleetAgentResponse>;
