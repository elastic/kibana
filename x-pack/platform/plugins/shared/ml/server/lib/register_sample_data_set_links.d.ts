import type { Logger } from '@kbn/core/server';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import type { MlFeatures } from '../../common/constants/app';
export declare function registerSampleDataSetLinks(home: HomeServerPluginSetup, enabledFeatures: MlFeatures, logger: Logger): void;
