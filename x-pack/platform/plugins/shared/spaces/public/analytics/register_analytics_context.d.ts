import type { Observable } from 'rxjs';
import type { AnalyticsClient } from '@kbn/core-analytics-browser';
import type { SolutionView, Space } from '../../common';
export interface SpaceMetadata {
    spaceSolutionView?: SolutionView;
}
export declare function registerAnalyticsContext(analytics: Pick<AnalyticsClient, 'registerContextProvider'>, activeSpace: Observable<Space>): void;
