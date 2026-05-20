import type { ExportShareDerivatives, RegisterShareIntegrationArgs } from '@kbn/share-plugin/public/types';
import type { ReportingAPIClient } from '@kbn/reporting-public';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { ReportingPublicPluginStartDependencies } from '../../plugin';
export interface CreateScheduledReportProviderOptions {
    apiClient: ReportingAPIClient;
    services: ReportingPublicPluginStartDependencies;
}
export declare const shouldRegisterScheduledReportShareIntegration: (http: HttpSetup) => Promise<boolean>;
export declare const createScheduledReportShareIntegration: ({ apiClient, services, }: CreateScheduledReportProviderOptions) => RegisterShareIntegrationArgs<ExportShareDerivatives>;
