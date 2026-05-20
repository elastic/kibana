import type { PluginInitializerContext } from '@kbn/core/public';
import { IngestPipelinesPlugin } from './plugin';
export declare function plugin(context: PluginInitializerContext): IngestPipelinesPlugin;
export { INGEST_PIPELINES_APP_LOCATOR, INGEST_PIPELINES_PAGES } from './locator';
export type { IngestPipelinesListParams } from './locator';
export type { IngestPipelinesPluginStart } from './types';
