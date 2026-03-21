import './space_selector.scss';
import React from 'react';
import type { Observable } from 'rxjs';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { SpacesManager } from '../spaces_manager';
export declare const VIEW_MODE_THRESHOLD = 20;
export interface SpaceSelectorProps {
    spacesManager: SpacesManager;
    serverBasePath: string;
    customBranding$: Observable<CustomBranding>;
}
export declare const SpaceSelector: ({ spacesManager, serverBasePath, customBranding$, }: SpaceSelectorProps) => React.JSX.Element;
export declare const renderSpaceSelectorApp: (services: Pick<CoreStart, "analytics" | "i18n" | "theme" | "userProfile" | "rendering">, { element }: Pick<AppMountParameters, "element">, props: SpaceSelectorProps) => () => boolean;
