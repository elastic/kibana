import type { PolicyFromES, Phases } from '@kbn/index-lifecycle-management-common-shared';
import type { SimulateIndexTemplateResponse } from '@kbn/index-management-shared-types';
/**
 * Phase description for UI display
 */
export interface PhaseDescription {
    description: string;
    color: string;
}
/**
 * ILM policy data for UI display
 */
export interface IlmPolicyDetails {
    name: string;
    phases: PhaseDescription[];
}
/**
 * Async function to fetch ILM policy by name
 */
export type IlmPolicyFetcher = (policyName: string, signal?: AbortSignal) => Promise<PolicyFromES | null>;
/**
 * Async function to fetch simulated template data by template name.
 */
export type SimulatedTemplateFetcher = (templateName: string, signal?: AbortSignal) => Promise<SimulateIndexTemplateResponse | null>;
/**
 * Phase indicator colors for ILM phases
 */
export interface PhaseColors {
    hot: string;
    warm: string;
    cold: string;
    frozen: string;
}
/**
 * Generates phase descriptions from an ILM policy's phases
 */
export declare const getPhaseDescriptions: (phases: Phases, phaseColors: PhaseColors) => PhaseDescription[];
