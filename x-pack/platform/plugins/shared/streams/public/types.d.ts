import type { Plugin as PluginClass } from '@kbn/core/public';
import type { Observable } from 'rxjs';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { EsqlPluginSetup } from '@kbn/esql/public';
import type { StreamsRepositoryClient } from './api';
import type { StreamsPublicConfig } from '../common/config';
import type { EnableStreamsResponse, DisableStreamsResponse } from '../server/lib/streams/client';
export interface StreamsNavigationStatus {
    status: 'enabled' | 'disabled';
}
export interface WiredStreamsStatus {
    logs: boolean | 'conflict' | 'unknown';
    'logs.otel': boolean | 'conflict' | 'unknown';
    'logs.ecs': boolean | 'conflict' | 'unknown';
    can_manage: boolean;
}
export interface ClassicStreamsStatus {
    can_manage: boolean;
}
export interface StreamsPluginSetup {
}
export interface StreamsPluginStart {
    streamsRepositoryClient: StreamsRepositoryClient;
    navigationStatus$: Observable<StreamsNavigationStatus>;
    getWiredStatus: () => Promise<WiredStreamsStatus>;
    getClassicStatus: () => Promise<ClassicStreamsStatus>;
    enableWiredMode: (signal: AbortSignal) => Promise<EnableStreamsResponse>;
    disableWiredMode: (signal: AbortSignal) => Promise<DisableStreamsResponse>;
    config$: Observable<StreamsPublicConfig>;
}
export interface StreamsPluginSetupDependencies {
    cloud?: CloudSetup;
    esql?: EsqlPluginSetup;
}
export interface StreamsPluginStartDependencies {
    cloud?: CloudStart;
    spaces?: SpacesPluginStart;
}
export type StreamsPluginClass = PluginClass<StreamsPluginSetup, StreamsPluginStart, StreamsPluginSetupDependencies, StreamsPluginStartDependencies>;
