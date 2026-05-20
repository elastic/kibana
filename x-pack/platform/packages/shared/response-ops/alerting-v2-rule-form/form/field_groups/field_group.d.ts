import React from 'react';
interface BaseFieldGroupProps {
    title: string;
    children: React.ReactNode;
}
type StaticFieldGroupProps = BaseFieldGroupProps & {
    isOpen?: never;
    onToggle?: never;
    defaultOpen?: never;
};
type ControlledCollapsibleFieldGroupProps = BaseFieldGroupProps & {
    isOpen: boolean;
    onToggle: () => void;
    defaultOpen?: never;
};
type UncontrolledCollapsibleFieldGroupProps = BaseFieldGroupProps & {
    defaultOpen?: boolean;
    isOpen?: never;
    onToggle?: never;
};
type FieldGroupProps = StaticFieldGroupProps | ControlledCollapsibleFieldGroupProps | UncontrolledCollapsibleFieldGroupProps;
export declare const FieldGroup: (props: FieldGroupProps) => React.JSX.Element;
export {};
