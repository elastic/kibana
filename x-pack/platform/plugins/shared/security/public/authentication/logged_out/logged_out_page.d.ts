import React from 'react';
import type { AppMountParameters, CustomBrandingStart, IBasePath } from '@kbn/core/public';
import type { StartServices } from '../..';
interface Props {
    basePath: IBasePath;
    customBranding: CustomBrandingStart;
}
export declare function LoggedOutPage({ basePath, customBranding }: Props): React.JSX.Element;
export declare function renderLoggedOutPage(services: StartServices, { element }: Pick<AppMountParameters, 'element'>, props: Props): () => boolean;
export {};
