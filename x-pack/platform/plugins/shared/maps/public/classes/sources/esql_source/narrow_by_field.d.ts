import React from 'react';
export declare function NarrowByMapBounds(props: Omit<NarrowByFieldProps, 'switchLabel' | 'fieldTypes'>): React.JSX.Element;
export declare function NarrowByTime(props: Omit<NarrowByFieldProps, 'switchLabel' | 'fieldTypes'>): React.JSX.Element;
interface NarrowByFieldProps {
    switchLabel: string;
    esql: string;
    field?: string;
    fields: string[];
    fieldTypes: string[];
    narrowByField: boolean;
    onFieldChange: (fieldName: string) => void;
    onNarrowByFieldChange: (narrowByField: boolean) => void;
}
export {};
