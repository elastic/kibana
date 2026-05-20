import React from 'react';
import type { ConfigEntryView } from '../types/types';
interface AdditionalOptionsFieldsProps {
    optionalProviderFormFields: ConfigEntryView[];
    onSetProviderConfigEntry: (key: string, value: unknown) => Promise<void>;
    isEdit?: boolean;
}
export declare const MoreOptionsFields: React.FC<AdditionalOptionsFieldsProps>;
export {};
