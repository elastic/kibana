import type { FleetServerAgentComponent, FleetServerAgentComponentStatus, FleetServerAgentComponentUnit } from '../../../../../../../../common/types/models/agent';
export declare class InputStatusFormatter {
    status?: FleetServerAgentComponentStatus;
    description?: string;
    hasError?: boolean;
    constructor(status?: FleetServerAgentComponentStatus, message?: string);
    getErrorTitleFromStatus(): string | undefined;
}
export declare const getInputUnitsByPackage: (agentComponents: FleetServerAgentComponent[], inputOrPackagePolicyId: string) => FleetServerAgentComponentUnit[];
export declare const getOutputUnitsByPackage: (agentComponents: FleetServerAgentComponent[], inputOrPackagePolicyId: string) => FleetServerAgentComponentUnit[];
export declare const getOutputUnitsByPackageAndInputType: (agentComponents: FleetServerAgentComponent[], inputOrPackagePolicyId: string, unitType: string) => FleetServerAgentComponentUnit | undefined;
