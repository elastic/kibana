import type { AppHeaderMenu } from '@kbn/app-header';
import type { CasesPermissions } from '../../../../../common';
interface GetListMenuArgs {
    permissions: CasesPermissions;
    isTemplatesEnabled: boolean;
    navigateToCreateCase: () => void;
    navigateToConfigureCases: () => void;
    navigateToCasesTemplates: () => void;
    getCasesTemplatesUrl: () => string;
}
export declare const getListMenu: ({ permissions, isTemplatesEnabled, navigateToCreateCase, navigateToConfigureCases, navigateToCasesTemplates, getCasesTemplatesUrl, }: GetListMenuArgs) => AppHeaderMenu;
export {};
