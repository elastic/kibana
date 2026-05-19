import React from 'react';
import type { ConfigEntryView, Map } from '../../types/types';
interface AuthenticationFormItemsProps {
    isEdit?: boolean;
    isLoading: boolean;
    isPreconfigured?: boolean;
    items: ConfigEntryView[];
    setConfigEntry: (key: string, value: string | number | boolean | null | Map) => void;
    reenterSecretsOnEdit?: boolean;
}
export declare const AuthenticationFormItems: React.FC<AuthenticationFormItemsProps>;
export {};
