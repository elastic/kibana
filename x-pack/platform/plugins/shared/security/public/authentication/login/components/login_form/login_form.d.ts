import React, { Component } from 'react';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import type { LoginSelector } from '../../../../../common/login_state';
import type { FormMessage } from '../../../components';
export interface LoginFormProps {
    http: HttpStart;
    notifications: NotificationsStart;
    selector: LoginSelector;
    message?: FormMessage;
    loginAssistanceMessage: string;
    loginHelp?: string;
    authProviderHint?: string;
}
interface State {
    loadingState: {
        type: LoadingStateType.None | LoadingStateType.Form | LoadingStateType.AutoLogin;
    } | {
        type: LoadingStateType.Selector;
        providerName: string;
    };
    username: string;
    password: string;
    message: FormMessage;
    mode: PageMode;
    previousMode: PageMode;
}
declare enum LoadingStateType {
    None = 0,
    Form = 1,
    Selector = 2,
    AutoLogin = 3
}
export declare enum PageMode {
    Selector = 0,
    Form = 1,
    LoginHelp = 2
}
export declare class LoginForm extends Component<LoginFormProps, State> {
    private readonly noProvidersMessage;
    private readonly validator;
    /**
     * Available providers that match the current origin.
     */
    private readonly availableProviders;
    /**
     * Optional provider that was suggested by the `auth_provider_hint={providerName}` query string parameter. If provider
     * doesn't require Kibana native login form then login process is triggered automatically, otherwise Login Selector
     * just switches to the Login Form mode.
     */
    private readonly suggestedProvider?;
    constructor(props: LoginFormProps);
    componentDidMount(): Promise<void>;
    render(): React.JSX.Element;
    private renderLoginAssistanceMessage;
    renderContent(): React.JSX.Element | undefined;
    private renderLoginForm;
    private renderSelector;
    private renderLoginHelp;
    private renderPageModeSwitchLink;
    private renderAutoLoginOverlay;
    private setUsernameInputRef;
    private onPageModeChange;
    private onUsernameChange;
    private onPasswordChange;
    private submitLoginForm;
    private loginWithSelector;
    private isLoadingState;
    private showLoginSelector;
    private providerMatchesOrigin;
}
export {};
