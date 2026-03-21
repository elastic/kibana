import type { KibanaFeature } from '@kbn/features-plugin/server';
import type { SolutionView } from '../../../common';
/**
 * When a space has a `solution` defined, we want to disable features that are not part of that solution.
 * This function takes the current space's disabled features and the space solution and returns
 * the updated array of disabled features.
 *
 * @param features The list of all Kibana registered features.
 * @param spaceDisabledFeatures The current space's disabled features
 * @param spaceSolution The current space's solution (es, oblt, security or classic)
 * @returns The updated array of disabled features
 */
export declare function withSpaceSolutionDisabledFeatures(features: KibanaFeature[], spaceDisabledFeatures?: string[], spaceSolution?: SolutionView): string[];
