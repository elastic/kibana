import type { DeprecationsServiceSetup, DocLinksServiceStart, Logger, PackageInfo } from '@kbn/core/server';
import type { SecurityLicense } from '../../common';
export declare const KIBANA_USER_ROLE_NAME = "kibana_user";
export declare const KIBANA_ADMIN_ROLE_NAME = "kibana_admin";
interface Deps {
    deprecationsService: DeprecationsServiceSetup;
    license: SecurityLicense;
    logger: Logger;
    packageInfo: PackageInfo;
    docLinks: DocLinksServiceStart;
}
export declare const registerKibanaUserRoleDeprecation: ({ deprecationsService, logger, license, packageInfo, docLinks, }: Deps) => void;
export {};
