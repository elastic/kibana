import type { CoreSetup } from '@kbn/core/server';
import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type { PluginStartContract } from '../plugin';
/** @internal **/
export declare const getFormatFactory: (core: CoreSetup<PluginStartContract>) => (context: ExecutionContext) => Promise<import("@kbn/field-formats-plugin/common").FormatFactory>;
/** @internal **/
export declare const getTimeZoneFactory: (core: CoreSetup<PluginStartContract>) => (context: ExecutionContext) => Promise<any>;
/** @internal **/
export declare const getDatatableUtilitiesFactory: (core: CoreSetup<PluginStartContract>) => (context: ExecutionContext) => Promise<import("@kbn/data-plugin/common").DatatableUtilitiesService>;
