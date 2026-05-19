import type { StartServicesAccessor } from '@kbn/core/server';
import type { LicensingPluginStart } from '../types';
import type { FeatureUsageServiceSetup } from '../services';
import type { LicensingRouter } from '../types';
export declare function registerRoutes(router: LicensingRouter, featureUsageSetup: FeatureUsageServiceSetup, getStartServices: StartServicesAccessor<{}, LicensingPluginStart>): void;
