import type { PopoverAnchorPosition } from '@elastic/eui';
import React from 'react';
import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import type { EventTracker } from '../analytics';
import type { SpacesManager } from '../spaces_manager';
export interface Props {
    spacesManager: SpacesManager;
    anchorPosition: PopoverAnchorPosition;
    capabilities: Capabilities;
    navigateToApp: ApplicationStart['navigateToApp'];
    navigateToUrl: ApplicationStart['navigateToUrl'];
    serverBasePath: string;
    allowSolutionVisibility: boolean;
    eventTracker: EventTracker;
    areAnnouncementsEnabled: boolean;
}
export declare const NavControlPopover: ({ spacesManager, anchorPosition, capabilities, navigateToApp, navigateToUrl, serverBasePath, allowSolutionVisibility, eventTracker, areAnnouncementsEnabled, }: Props) => React.JSX.Element;
