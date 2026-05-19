import React from 'react';
import { type Map, type ConfigEntryView } from '../../types/types';
interface ConfigurationFieldProps {
    configEntry: ConfigEntryView;
    isLoading: boolean;
    setConfigValue: (value: number | string | boolean | null | Map) => void;
    isEdit?: boolean;
    isPreconfigured?: boolean;
}
interface ConfigInputFieldProps {
    configEntry: ConfigEntryView;
    isLoading: boolean;
    validateAndSetConfigValue: (value: string | boolean | Map) => void;
    isEdit?: boolean;
    isPreconfigured?: boolean;
}
export declare const ConfigInputField: React.FC<ConfigInputFieldProps>;
export declare const ConfigSwitchField: React.FC<ConfigInputFieldProps>;
export declare const ConfigInputTextArea: React.FC<ConfigInputFieldProps>;
export declare const ConfigNumberField: React.FC<ConfigInputFieldProps>;
export declare const ConfigSensitiveTextArea: React.FC<ConfigInputFieldProps>;
export declare const ConfigInputPassword: React.FC<ConfigInputFieldProps>;
export declare const ConfigInputMapField: React.FC<ConfigInputFieldProps>;
export declare const ConfigurationField: React.FC<ConfigurationFieldProps>;
export {};
