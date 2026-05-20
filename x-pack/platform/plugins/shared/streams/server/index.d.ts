import type { PluginInitializerContext } from '@kbn/core-plugins-server';
import type { StreamsConfig } from '../common/config';
import type { StreamsPluginSetup, StreamsPluginStart } from './plugin';
import type { StreamsRouteRepository } from './routes';
import { config } from './config';
export type { StreamsConfig, StreamsPluginSetup, StreamsPluginStart, StreamsRouteRepository };
export { config };
export declare const plugin: (context: PluginInitializerContext<StreamsConfig>) => Promise<import("./plugin").StreamsPlugin>;
