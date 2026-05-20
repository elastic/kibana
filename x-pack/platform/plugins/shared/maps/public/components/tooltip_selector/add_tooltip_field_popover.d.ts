import React, { Component } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
export type FieldProps = {
    label: string;
    type: string;
    name: string;
};
type FieldOption = EuiSelectableOption<{
    value: string;
}>;
interface Props {
    onAdd: (checkedFieldNames: string[]) => void;
    fields: FieldProps[];
    selectedFields: FieldProps[];
}
interface State {
    isPopoverOpen: boolean;
    checkedFields: string[];
    options?: FieldOption[];
    prevFields?: FieldProps[];
    prevSelectedFields?: FieldProps[];
}
export declare class AddTooltipFieldPopover extends Component<Props, State> {
    state: State;
    static getDerivedStateFromProps(nextProps: Props, prevState: State): {
        options: ((import("@elastic/eui").DisambiguateSet<import("@elastic/eui/src/components/selectable/selectable_option").EuiSelectableGroupLabelOption<{}>, import("@elastic/eui/src/components/selectable/selectable_option").EuiSelectableLIOption<{}>> & import("@elastic/eui").CommonProps & {
            label: string;
            searchableLabel?: string;
            key?: string;
            checked?: import("@elastic/eui/src/components/selectable/selectable_option").EuiSelectableOptionCheckedType;
            disabled?: boolean;
            isGroupLabel?: false;
            prepend?: React.ReactNode;
            append?: React.ReactNode;
            ref?: (optionIndex: number) => void;
            id?: never;
            data?: {
                [key: string]: any;
            };
            textWrap?: "truncate" | "wrap";
            truncationProps?: Partial<Omit<import("@elastic/eui").EuiTextTruncateProps, "text" | "children">>;
            toolTipContent?: import("@elastic/eui").EuiToolTipProps["content"];
            toolTipProps?: Partial<Omit<import("@elastic/eui").EuiToolTipProps, "content" | "children">>;
        } & React.HTMLAttributes<HTMLLIElement>) | (import("@elastic/eui").DisambiguateSet<import("@elastic/eui/src/components/selectable/selectable_option").EuiSelectableLIOption<{}>, import("@elastic/eui/src/components/selectable/selectable_option").EuiSelectableGroupLabelOption<{}>> & Omit<import("@elastic/eui/src/components/selectable/selectable_option").EuiSelectableOptionBase, "isGroupLabel"> & React.HTMLAttributes<HTMLDivElement> & {
            isGroupLabel: true;
        }))[];
        checkedFields: never[];
        prevFields: FieldProps[];
        prevSelectedFields: FieldProps[];
    } | null;
    _togglePopover: () => void;
    _closePopover: () => void;
    _onSelect: (options: FieldOption[]) => void;
    _onAdd: () => void;
    _renderAddButton(): React.JSX.Element;
    _renderContent(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};
