import React, { Component } from 'react';
import type { AppMountParameters, ScopedHistory } from '@kbn/core/public';
import type { EmbeddableStateTransfer, EmbeddableEditorBreadcrumb } from '@kbn/embeddable-plugin/public';
import { SavedMap } from './saved_map';
import type { MapEmbeddableState } from '../../../common';
interface Props {
    mapEmbeddableState?: MapEmbeddableState;
    embeddableId?: string;
    onAppLeave: AppMountParameters['onAppLeave'];
    setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
    stateTransfer: EmbeddableStateTransfer;
    originatingApp?: string;
    originatingPath?: string;
    breadcrumbs?: EmbeddableEditorBreadcrumb[];
    history: ScopedHistory;
}
interface State {
    savedMap: SavedMap;
    saveCounter: number;
}
export declare class MapPage extends Component<Props, State> {
    private _isMounted;
    constructor(props: Props);
    componentDidMount(): void;
    componentWillUnmount(): void;
    updateSaveCounter: () => void;
    render(): React.JSX.Element;
}
export {};
