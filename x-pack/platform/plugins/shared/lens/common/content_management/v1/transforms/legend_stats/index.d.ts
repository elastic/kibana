import type { LensAttributes } from '../../../../../server/content_management/v1/types';
export declare function convertToLegendStats(attributes: LensAttributes): LensAttributes;
export declare function getUpdatedVisualizationState(visualizationType: LensAttributes['visualizationType'], state: LensAttributes['state'] & {
    visualization?: unknown;
}): LensAttributes['state'];
