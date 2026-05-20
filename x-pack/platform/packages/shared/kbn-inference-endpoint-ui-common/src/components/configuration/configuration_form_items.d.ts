import React from 'react';
import type { ConfigEntryView, Map } from '../../types/types';
interface ConfigurationFormItemsProps {
    dataTestSubj?: string;
    descriptionLinks?: Record<string, React.ReactNode>;
    direction?: 'column' | 'row' | 'rowReverse' | 'columnReverse' | undefined;
    isEdit?: boolean;
    isLoading: boolean;
    isPreconfigured?: boolean;
    isInternalProvider?: boolean;
    items: ConfigEntryView[];
    setConfigEntry: (key: string, value: string | number | boolean | null | Map) => void;
}
export declare const ConfigurationFormItems: React.FC<ConfigurationFormItemsProps>;
export {};
