import type { OperatorFunction } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { ModelProvider } from '@kbn/inference-common';
import type { AnalyticsService, TrackingService } from '../../../telemetry';
export declare function convertErrors<T>({ agentId, analyticsService, conversationId, executionId, logger, modelProvider, trackingService, }: {
    agentId: string;
    analyticsService?: AnalyticsService;
    conversationId?: string;
    executionId?: string;
    logger: Logger;
    modelProvider: ModelProvider;
    trackingService?: TrackingService;
}): OperatorFunction<T, T>;
