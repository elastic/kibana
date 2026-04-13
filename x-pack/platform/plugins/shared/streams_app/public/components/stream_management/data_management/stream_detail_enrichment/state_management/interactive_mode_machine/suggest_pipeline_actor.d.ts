import type { IToasts, NotificationsStart } from '@kbn/core/public';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { type StreamlangDSL } from '@kbn/streamlang';
import type { StreamsTelemetryClient } from '../../../../../telemetry/client';
import type { SampleDocumentWithUIAttributes } from '../simulation_state_machine/types';
export interface SuggestPipelineInputMinimal {
    streamName: string;
    connectorId: string;
    documents: SampleDocumentWithUIAttributes[];
}
export interface SuggestPipelineInput extends SuggestPipelineInputMinimal {
    signal: AbortSignal;
    streamsRepositoryClient: StreamsRepositoryClient;
    telemetryClient: StreamsTelemetryClient;
    notifications: NotificationsStart;
}
export declare function suggestPipelineLogic(input: SuggestPipelineInput): Promise<StreamlangDSL>;
export declare const createSuggestPipelineActor: ({ streamsRepositoryClient, telemetryClient, notifications, }: {
    streamsRepositoryClient: StreamsRepositoryClient;
    telemetryClient: StreamsTelemetryClient;
    notifications: NotificationsStart;
}) => import("xstate").PromiseActorLogic<StreamlangDSL, SuggestPipelineInputMinimal, import("xstate").EventObject>;
export declare const createNotifySuggestionFailureNotifier: ({ toasts }: {
    toasts: IToasts;
}) => (params: {
    event: unknown;
}) => void;
