import React, { Component } from 'react';
export interface Props {
    removeClusters: (names: string[]) => void;
    clusterNames: string[];
    children: (showModal: () => void) => React.ReactNode;
}
interface State {
    isModalOpen: boolean;
}
export declare class RemoveClusterButtonProvider extends Component<Props, State> {
    state: State;
    onMouseOverModal: (event: React.MouseEvent) => void;
    showConfirmModal: () => void;
    closeConfirmModal: () => void;
    onConfirm: () => void;
    render(): React.JSX.Element;
}
export {};
