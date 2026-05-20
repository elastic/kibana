import React, { Component } from 'react';
import type { History } from 'history';
import type { RemoteCluster } from '../../../store/types';
export interface Props {
    isOpen: boolean;
    isLoading?: boolean;
    cluster?: RemoteCluster;
    closeDetailPanel: () => void;
    clusterName?: string;
}
export declare class DetailPanel extends Component<Props> {
    renderSkipUnavailableValue(skipUnavailable: boolean | undefined): React.JSX.Element;
    renderClusterNotFound(): React.JSX.Element;
    renderClusterConfiguredByNodeWarning({ isConfiguredByNode }: {
        isConfiguredByNode?: boolean;
    }): React.JSX.Element | null;
    renderClusterWithDeprecatedSettingWarning({ hasDeprecatedProxySetting, isConfiguredByNode, }: {
        hasDeprecatedProxySetting?: boolean;
        isConfiguredByNode?: boolean;
    }, clusterName: string, history: History): React.JSX.Element | null;
    renderSniffModeDescriptionList({ isConnected, connectedNodesCount, skipUnavailable, seeds, maxConnectionsPerCluster, nodeConnections, initialConnectTimeout, mode, securityModel, }: Pick<RemoteCluster, 'isConnected' | 'connectedNodesCount' | 'skipUnavailable' | 'seeds' | 'maxConnectionsPerCluster' | 'nodeConnections' | 'initialConnectTimeout' | 'mode' | 'securityModel'>): React.JSX.Element;
    renderProxyModeDescriptionList({ isConnected, skipUnavailable, initialConnectTimeout, proxyAddress, proxySocketConnections, maxProxySocketConnections, connectedSocketsCount, mode, serverName, securityModel, }: Pick<RemoteCluster, 'isConnected' | 'skipUnavailable' | 'initialConnectTimeout' | 'proxyAddress' | 'proxySocketConnections' | 'maxProxySocketConnections' | 'connectedSocketsCount' | 'mode' | 'serverName' | 'securityModel'>): React.JSX.Element;
    renderCluster(cluster: RemoteCluster): React.JSX.Element;
    renderFlyoutBody(history: History): React.JSX.Element;
    renderFlyoutFooter(history: History): React.JSX.Element;
    render(): React.JSX.Element | null;
}
