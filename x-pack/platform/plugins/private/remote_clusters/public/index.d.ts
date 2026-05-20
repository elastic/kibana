import type { PluginInitializerContext } from '@kbn/core/public';
import { RemoteClustersUIPlugin } from './plugin';
export type { Cluster } from '../common/lib';
export { API_BASE_PATH as REMOTE_CLUSTERS_PATH } from '../common/constants';
export type { RemoteClustersPluginSetup } from './plugin';
export declare const plugin: (initializerContext: PluginInitializerContext) => RemoteClustersUIPlugin;
