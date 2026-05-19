import type { Agent } from '../types';
export declare const checkFleetServerVersion: (versionToUpgradeNumber: string, fleetServerAgents: Agent[], force?: boolean) => void;
export declare const getFleetServerVersionMessage: (versionToUpgradeNumber: string | undefined, fleetServerAgents: Agent[], force?: boolean) => any;
export declare const isAgentVersionLessThanFleetServer: (versionToUpgradeNumber: string | undefined, fleetServerAgents: Agent[], force?: boolean) => boolean;
