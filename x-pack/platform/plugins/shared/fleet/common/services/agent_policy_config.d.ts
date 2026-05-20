import type { ILicense } from '@kbn/licensing-types';
import type { AgentPolicy } from '../types';
export declare const isAgentPolicyValidForLicense: (policy: Partial<AgentPolicy>, license: ILicense | null) => boolean;
/**
 * Resets paid features in a AgentPolicy back to default values
 * when unsupported by the given license level.
 */
export declare const unsetAgentPolicyAccordingToLicenseLevel: (policy: Partial<AgentPolicy>, license: ILicense | null) => Partial<AgentPolicy>;
