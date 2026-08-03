import React from 'react';
import type { ConfigEntryView } from '../../types/types';
import { type Map } from '../../types/types';
interface ItemFormRowProps {
    configEntry: ConfigEntryView;
    dataTestSubj?: string;
    descriptionLinks?: Record<string, React.ReactNode>;
    isPreconfigured?: boolean;
    isInternalProvider?: boolean;
    isEdit?: boolean;
    isLoading: boolean;
    setConfigEntry: (key: string, value: string | number | boolean | null | Map) => void;
    reenterSecretsOnEdit?: boolean;
}
export declare const ItemFormRow: React.FC<ItemFormRowProps>;
export {};
