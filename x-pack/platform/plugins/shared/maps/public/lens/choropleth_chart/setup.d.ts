import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { CoreSetup } from '@kbn/core/public';
import type { LensPublicSetup } from '@kbn/lens-plugin/public';
import type { MapsPluginStartDependencies } from '../../plugin';
export declare function setupLensChoroplethChart(coreSetup: CoreSetup<MapsPluginStartDependencies>, expressions: ExpressionsSetup, lens: LensPublicSetup): void;
