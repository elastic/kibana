import React from 'react';
import type { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
interface NamespacesSelectorProps {
    isLoading: boolean;
    namespaces: NamespaceItem[];
    onNamespacesChange: (namespaces: NamespaceItem[]) => void;
}
export interface NamespaceItem {
    label: string;
    checked?: EuiSelectableOptionCheckedType;
}
export declare function NamespacesSelector({ isLoading, namespaces, onNamespacesChange, }: NamespacesSelectorProps): React.JSX.Element;
export {};
