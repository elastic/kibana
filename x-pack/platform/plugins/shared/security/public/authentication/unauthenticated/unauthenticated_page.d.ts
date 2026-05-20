import React from 'react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
interface Props {
    loginUrl: string;
}
export declare function UnauthenticatedPage({ loginUrl }: Props): React.JSX.Element;
export declare function renderUnauthenticatedPage(services: CoreStart, { element }: Pick<AppMountParameters, 'element'>, props: Props): () => boolean;
export {};
