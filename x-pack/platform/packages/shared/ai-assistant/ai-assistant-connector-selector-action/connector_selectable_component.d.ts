import React from 'react';
import type { EuiSelectableOption, EuiSelectableProps } from '@elastic/eui';
import type { EuiSelectableLIOption } from '@elastic/eui/src/components/selectable/selectable_option';
/** Props for the `ConnectorSelectableComponent` */
export interface ConnectorSelectableComponentProps<T extends {
    value: string;
} = {
    value: string;
}> {
    /** Pre-configured connectors to display in the selector */
    preConfiguredConnectors: (EuiSelectableLIOption<T> & {
        key?: undefined;
        checked?: undefined;
    })[];
    /** Custom connectors to display in the selector */
    customConnectors: (EuiSelectableLIOption<T> & {
        key?: undefined;
        checked?: undefined;
    })[];
    /** Default connector id if a default connector has been configured. */
    defaultConnectorId?: string;
    /** Optional test subject for the component. */
    ['data-test-subj']?: string;
    /** Controlled selected connector value. */
    value?: string;
    /** Uncontrolled initial selected connector value. */
    defaultValue?: string;
    /** Callback that provides the selected connector value (string). */
    onValueChange?: (value: string, option: EuiSelectableOption<T>) => void;
    /** Selectable footer component */
    footer?: React.ReactElement;
    /** Render option component */
    renderOption?: EuiSelectableProps['renderOption'];
}
export declare const ConnectorSelectableComponent: <T extends {
    value: string;
} = {
    value: string;
}>(props: ConnectorSelectableComponentProps<T>) => React.JSX.Element;
