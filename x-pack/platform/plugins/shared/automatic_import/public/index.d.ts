import type { PluginInitializerContext } from '@kbn/core/public';
import type { AutomaticImportPlugin } from './plugin';
export type { AutomaticImportPluginSetup, AutomaticImportPluginStart } from './types';
export type { DataStreamResultsFlyoutComponent } from './components/data_stream_results_flyout/types';
export { AutomaticImportTelemetryEventType } from '../common/telemetry/types';
export type { DataStreamResponse, TaskStatus } from '../common';
export declare function plugin(_initializerContext: PluginInitializerContext): AutomaticImportPlugin;
