import type { StartServicesAccessor } from '@kbn/core/server';
import type { LicensingPluginStart } from '../types';
import type { LicensingRouter } from '../types';
export declare function registerFeatureUsageRoute(router: LicensingRouter, getStartServices: StartServicesAccessor<{}, LicensingPluginStart>): void;
