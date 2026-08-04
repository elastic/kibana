import type { SolutionView } from '../../../common';
/**
 * Cloud does not type the value of the "use case" that is set during onboarding for a deployment. Any string can
 * be passed. This function maps the known values to the Kibana values.
 *
 * @param value The solution value set by Cloud.
 * @returns The default solution value for onboarding that matches Kibana naming.
 */
export declare function parseCloudSolution(value?: string): SolutionView;
