import type { CoreSetup } from '@kbn/core/server';
import type { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import type { PluginStartContract } from '../plugin';
export declare const setupExpressions: (core: CoreSetup<PluginStartContract>, expressions: ExpressionsServerSetup) => void;
