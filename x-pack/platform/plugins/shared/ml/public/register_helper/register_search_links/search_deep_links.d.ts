import type { LinkId } from '@kbn/deeplinks-ml';
import { type AppDeepLink } from '@kbn/core/public';
import type { MlCapabilities } from '@kbn/ml-common-types/capabilities';
export declare function getDeepLinks(isFullLicense: boolean, mlCapabilities: MlCapabilities, isServerless: boolean, esqlEnabled?: boolean): Array<AppDeepLink<LinkId>>;
