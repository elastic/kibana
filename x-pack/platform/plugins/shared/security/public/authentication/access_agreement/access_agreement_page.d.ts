import React from 'react';
import type { AppMountParameters, FatalErrorsStart, HttpStart, NotificationsStart } from '@kbn/core/public';
import type { StartServices } from '../..';
interface Props {
    http: HttpStart;
    notifications: NotificationsStart;
    fatalErrors: FatalErrorsStart;
}
export declare function AccessAgreementPage({ http, fatalErrors, notifications }: Props): React.JSX.Element;
export declare function renderAccessAgreementPage(services: StartServices, { element }: Pick<AppMountParameters, 'element'>, props: Props): () => boolean;
export {};
