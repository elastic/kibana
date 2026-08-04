import type { ContextSwitcherSpacesConfig } from '@kbn/context-switcher-components';
import type { CoreStart } from '@kbn/core/public';
type Actions = Pick<ContextSwitcherSpacesConfig, 'headerAction' | 'footerAction'>;
export declare const useManagementActions: ({ application, canManageSpaces, }: {
    application: CoreStart["application"];
    canManageSpaces?: boolean;
}) => Partial<Actions>;
export {};
