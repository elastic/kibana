import type { EuiConfirmModalProps } from '@elastic/eui';
import React from 'react';
interface ModalOptions {
    buttonColor?: EuiConfirmModalProps['buttonColor'];
    confirmButtonText?: string;
}
export declare function useConfirmModal(): {
    confirm: (title: React.ReactNode, description: React.ReactNode, options?: ModalOptions) => Promise<boolean>;
};
export declare function withConfirmModalProvider<T>(WrappedComponent: React.FunctionComponent<T>): (props: T) => React.JSX.Element;
export declare const ConfirmModalProvider: React.FunctionComponent<{
    children?: React.ReactNode;
}>;
export {};
