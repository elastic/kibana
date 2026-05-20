export declare function sendGetAllFleetServerAgents(onlyCount?: boolean): Promise<{
    allFleetServerAgents: never[];
    fleetServerAgentsCount?: undefined;
} | {
    allFleetServerAgents: import("../types").Agent[];
    fleetServerAgentsCount: number;
}>;
