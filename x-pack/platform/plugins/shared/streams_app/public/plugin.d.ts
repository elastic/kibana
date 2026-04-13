import type { AppMountParameters } from '@kbn/core/public';
import { type CoreSetup, type CoreStart, type Plugin, type PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type { ConfigSchema, StreamsAppPublicSetup, StreamsAppPublicStart, StreamsAppSetupDependencies, StreamsAppStartDependencies } from './types';
import type { StreamsAppServices } from './services/types';
import { StreamsTelemetryService } from './telemetry/service';
export declare const renderApp: ({ appMountParameters, services, coreStart, pluginsStart, isServerless, }: {
    appMountParameters: AppMountParameters;
    services: StreamsAppServices;
    coreStart: CoreStart;
    pluginsStart: StreamsAppStartDependencies;
    isServerless: boolean;
}) => () => void;
/**
 * Renders the Streams list view into a container (e.g. for embedding in Ingest Hub).
 * Does not touch the global app wrapper. Returns an unmount function.
 */
export declare const renderEmbeddedStreamList: ({ container, coreStart, pluginsStart, services, isServerless, }: {
    container: HTMLElement;
    coreStart: CoreStart;
    pluginsStart: StreamsAppStartDependencies;
    services: StreamsAppServices;
    isServerless: boolean;
}) => (() => void);
export declare class StreamsAppPlugin implements Plugin<StreamsAppPublicSetup, StreamsAppPublicStart, StreamsAppSetupDependencies, StreamsAppStartDependencies> {
    private readonly context;
    logger: Logger;
    telemetry: StreamsTelemetryService;
    private readonly version;
    constructor(context: PluginInitializerContext<ConfigSchema>);
    setup(coreSetup: CoreSetup<StreamsAppStartDependencies>): StreamsAppPublicSetup;
    start(coreStart: CoreStart, pluginsStart: StreamsAppStartDependencies): StreamsAppPublicStart;
}
