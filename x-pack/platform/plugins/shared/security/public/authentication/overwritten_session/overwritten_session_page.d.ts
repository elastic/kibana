import React from 'react';
import type { AppMountParameters, IBasePath } from '@kbn/core/public';
import type { AuthenticationServiceSetup } from '@kbn/security-plugin-types-public';
import type { StartServices } from '../..';
interface Props {
    basePath: IBasePath;
    authc: Pick<AuthenticationServiceSetup, 'getCurrentUser'>;
}
export declare function OverwrittenSessionPage({ authc, basePath }: Props): React.JSX.Element | null;
export declare function renderOverwrittenSessionPage(services: StartServices, { element }: Pick<AppMountParameters, 'element'>, props: Props): () => boolean;
export {};
