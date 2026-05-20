import React, { Component } from 'react';
import type { BuildFlavor } from '@kbn/config';
interface Props {
    roleName: string;
    canDelete: boolean;
    onDelete: () => void;
    buildFlavor?: BuildFlavor;
}
interface State {
    showModal: boolean;
}
export declare class DeleteRoleButton extends Component<Props, State> {
    state: {
        showModal: boolean;
    };
    render(): React.JSX.Element | null;
    maybeShowModal: () => React.JSX.Element | null;
    closeModal: () => void;
    showModal: () => void;
    onConfirmDelete: () => void;
}
export {};
