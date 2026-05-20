import type { HttpSetup } from '@kbn/core/public';
import type { TimeSeriesResult } from '@kbn/triggers-actions-ui-plugin/common';
import type { IndexThresholdRuleParams } from './types';
export interface GetThresholdRuleVisualizationDataParams {
    model: IndexThresholdRuleParams;
    visualizeOptions: {
        rangeFrom: string;
        rangeTo: string;
        interval: string;
    };
    http: HttpSetup;
    /** Cross-project search scope (serverless); forwarded as `project_routing` on the request body. */
    projectRouting?: string;
}
export declare function getThresholdRuleVisualizationData({ model, visualizeOptions, http, projectRouting, }: GetThresholdRuleVisualizationDataParams): Promise<TimeSeriesResult>;
