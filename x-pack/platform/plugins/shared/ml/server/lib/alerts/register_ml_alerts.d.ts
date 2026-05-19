import type { Logger } from '@kbn/core/server';
import type { AlertingPlugin } from '@kbn/alerting-plugin/server';
import type { MlFeatures } from '../../../common/constants/app';
import type { SharedServices } from '../../shared_services';
import type { MlServicesProviders } from '../../shared_services/shared_services';
export interface RegisterAlertParams {
    alerting: AlertingPlugin['setup'];
    logger: Logger;
    mlSharedServices: SharedServices;
    mlServicesProviders: MlServicesProviders;
}
export declare function registerMlAlerts(alertParams: RegisterAlertParams, enabledFeatures: MlFeatures): void;
