import React, { Component } from 'react';
import type { AppMountParameters, CustomBrandingStart, FatalErrorsStart, HttpStart, NotificationsStart } from '@kbn/core/public';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { StartServices } from '../..';
import type { LoginState } from '../../../common/login_state';
import type { ConfigType } from '../../config';
interface Props {
    http: HttpStart;
    notifications: NotificationsStart;
    fatalErrors: FatalErrorsStart;
    loginAssistanceMessage: string;
    sameSiteCookies?: ConfigType['sameSiteCookies'];
    customBranding: CustomBrandingStart;
}
interface State {
    loginState: LoginState | null;
    customBranding: CustomBranding;
}
export declare class LoginPage extends Component<Props, State> {
    state: State;
    private customBrandingSubscription?;
    componentDidMount(): Promise<void>;
    componentWillUnmount(): void;
    render(): React.JSX.Element | null;
    private getLoginForm;
}
export declare function renderLoginPage(services: StartServices, { element }: Pick<AppMountParameters, 'element'>, props: Props): () => boolean;
export {};
