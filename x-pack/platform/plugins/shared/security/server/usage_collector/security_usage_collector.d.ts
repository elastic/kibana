import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { SecurityLicense } from '../../common';
import type { ConfigType } from '../config';
interface Deps {
    usageCollection?: UsageCollectionSetup;
    config: ConfigType;
    license: SecurityLicense;
}
export declare function registerSecurityUsageCollector({ usageCollection, config, license }: Deps): void;
export {};
