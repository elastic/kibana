import React from 'react';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ActionConnector } from '../../../common/types/domain';
interface ConnectorSelectorProps {
    connectors: ActionConnector[];
    dataTestSubj: string;
    disabled: boolean;
    field: FieldHook<string>;
    idAria: string;
    isLoading: boolean;
    handleChange?: (newValue: string) => void;
}
export declare const ConnectorSelector: {
    ({ connectors, dataTestSubj, disabled, field, idAria, isLoading, handleChange, }: ConnectorSelectorProps): React.JSX.Element;
    displayName: string;
};
export {};
