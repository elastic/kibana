import React, { PureComponent } from 'react';
import type { ClusterPayload } from '../../../../../../common/lib';
import type { SNIFF_MODE, PROXY_MODE } from '../../../../../../common/constants';
interface Props {
    close: () => void;
    cluster: ClusterPayload;
    previousClusterMode?: typeof PROXY_MODE | typeof SNIFF_MODE;
}
export declare class RequestFlyout extends PureComponent<Props> {
    render(): React.JSX.Element;
}
export {};
