import type { ApplicationStart, HttpSetup, ToastsStart } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ClientConfigType, ReportingAPIClient } from '@kbn/reporting-public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
export interface ListingProps {
    apiClient: ReportingAPIClient;
    license$: LicensingPluginStart['license$'];
    config: ClientConfigType;
    redirect: ApplicationStart['navigateToApp'];
    navigateToUrl: ApplicationStart['navigateToUrl'];
    toasts: ToastsStart;
    urlService: SharePluginStart['url'];
}
export type ListingPropsInternal = ListingProps & {
    capabilities: ApplicationStart['capabilities'];
    http: HttpSetup;
};
export { ReportingTabs } from './components/reporting_tabs';
