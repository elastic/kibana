import React from 'react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
interface Props {
    logoutUrl: string;
}
export declare function ResetSessionPage({ logoutUrl }: Props): React.JSX.Element;
export declare function renderResetSessionPage(services: CoreStart, { element }: Pick<AppMountParameters, 'element'>, props: Props): () => boolean;
export {};
