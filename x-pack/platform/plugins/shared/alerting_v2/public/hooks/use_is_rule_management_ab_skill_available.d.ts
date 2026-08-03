import type { ApplicationStart } from '@kbn/core-application-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
/**
 * Granular prerequisites for the rule-management Agent Builder skill. Exposed (rather than only a
 * single boolean) so callers can explain which specific requirement is missing.
 */
export interface RuleManagementABSkillRequirements {
    /** Whether the user has the privilege backing `capabilities.agentBuilder.show`. */
    hasAgentBuilderCapability: boolean;
    /** Whether the `agentBuilder:experimentalFeatures` advanced setting is enabled. */
    isExperimentalFeaturesEnabled: boolean;
}
/**
 * Pure function usable outside of the DI context (e.g. the Discover flyout).
 */
export declare const getRuleManagementABSkillRequirements: (application: ApplicationStart, uiSettings: IUiSettingsClient) => RuleManagementABSkillRequirements;
/**
 * Pure function usable outside of the DI context (e.g. the Discover flyout).
 */
export declare const getIsRuleManagementABSkillAvailable: (application: ApplicationStart, uiSettings: IUiSettingsClient) => boolean;
/**
 * Hook exposing the granular skill prerequisites for components in the Inversify DI context.
 */
export declare const useRuleManagementABSkillRequirements: () => RuleManagementABSkillRequirements;
/**
 * Hook for components rendered inside the Inversify DI context.
 */
export declare const useIsRuleManagementABSkillAvailable: () => boolean;
