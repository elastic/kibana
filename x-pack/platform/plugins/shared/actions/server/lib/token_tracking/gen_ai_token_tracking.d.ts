import type { Logger } from '@kbn/logging';
import type { ActionTypeExecutorRawResult } from '../../../common';
export interface TelemetryMetadata {
    pluginId?: string;
    aggregateBy?: string;
}
interface OwnProps {
    actionTypeId: string;
    logger: Logger;
    result: ActionTypeExecutorRawResult<unknown>;
    validatedParams: Record<string, unknown>;
}
export declare const getGenAiTokenTracking: ({ actionTypeId, logger, result, validatedParams, }: OwnProps) => Promise<{
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    telemetry_metadata?: TelemetryMetadata;
} | null>;
export declare const shouldTrackGenAiToken: (actionTypeId: string, subAction?: string) => boolean;
export {};
