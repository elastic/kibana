import React from 'react';
import { type FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ConnectorFieldsProps } from '../types';
export declare const AdditionalFormFields: React.NamedExoticComponent<{
    field: FieldHook<string, string>;
    connector: ConnectorFieldsProps["connector"];
    isInSidebarForm: boolean;
}>;
