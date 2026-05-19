import React from 'react';
import type { RemoteCluster } from '../../../../store/types';
interface Props {
    isConnected?: boolean;
    mode?: RemoteCluster['mode'];
}
export declare function ConnectionStatus({ isConnected, mode }: Props): React.JSX.Element;
export {};
