import type { FleetAuthz } from '../../common';
import type { Output } from '../types';
export { transformOutputToFullPolicyOutput } from './agent_policies/full_agent_policy';
export interface OutputClientInterface {
    getDefaultDataOutputId(): Promise<string | null>;
    get(outputId: string): Promise<Output>;
}
export declare class OutputClient implements OutputClientInterface {
    private authz;
    constructor(authz: FleetAuthz);
    getDefaultDataOutputId(): Promise<string | null>;
    get(outputId: string): Promise<Output>;
}
