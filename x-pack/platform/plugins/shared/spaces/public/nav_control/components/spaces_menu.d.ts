import type { WithEuiThemeProps } from '@elastic/eui';
import React from 'react';
import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import type { InjectedIntl } from '@kbn/i18n-react';
import type { Space } from '../../../common';
import type { EventTracker } from '../../analytics';
interface Props {
    id: string;
    spaces: Space[];
    serverBasePath: string;
    toggleSpaceSelector: () => void;
    onClickManageSpaceBtn: () => void;
    intl: InjectedIntl;
    capabilities: Capabilities;
    navigateToApp: ApplicationStart['navigateToApp'];
    navigateToUrl: ApplicationStart['navigateToUrl'];
    readonly activeSpace: Space | null;
    allowSolutionVisibility: boolean;
    eventTracker: EventTracker;
    isLoading: boolean;
}
export declare const SpacesMenu: React.ForwardRefExoticComponent<Omit<Omit<Props & WithEuiThemeProps<{}>, "intl"> & {
    forwardedRef?: React.Ref<any>;
}, "theme"> & React.RefAttributes<Omit<Omit<Props & WithEuiThemeProps<{}>, "intl"> & {
    forwardedRef?: React.Ref<any>;
}, "theme">>>;
export {};
