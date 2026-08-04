import type { ComponentType, FC } from 'react';
import type { ApplicationStart, HttpStart, IUiSettingsClient } from '@kbn/core/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { SavedObjectFinderProps } from '@kbn/saved-objects-finder-plugin/public';
export type { SavedObjectFinderProps };
export interface MlOpenSessionFlyoutServices {
    http: HttpStart;
    application: ApplicationStart;
    contentManagement: ContentManagementPublicStart;
    uiSettings: IUiSettingsClient;
}
export interface MlOpenSessionFlyoutProps {
    services: MlOpenSessionFlyoutServices;
    onClose: () => void;
    onOpenSavedSearch: (id: string) => void;
    SavedObjectFinderComponent: ComponentType<SavedObjectFinderProps>;
}
export declare const MlOpenSessionFlyout: FC<MlOpenSessionFlyoutProps>;
