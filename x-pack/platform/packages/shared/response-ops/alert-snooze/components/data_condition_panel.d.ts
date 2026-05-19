import React from 'react';
import type { DataConditionEntry, DataConditionTypeDescriptor } from './types';
export type LogicalOperator = 'all' | 'any';
export type { DataConditionEntry } from './types';
export interface DataConditionPanelProps {
    entry: DataConditionEntry;
    onChange: (newValue: DataConditionEntry | null) => void;
    /**
     * Descriptors for every type that may appear in the dropdown.
     */
    descriptors?: readonly DataConditionTypeDescriptor[];
    /**
     * Type ids that should be hidden from the type dropdown.
     */
    disabledTypes?: readonly string[];
}
export declare const DataConditionPanel: ({ entry, onChange, descriptors, disabledTypes, }: DataConditionPanelProps) => React.JSX.Element | null;
