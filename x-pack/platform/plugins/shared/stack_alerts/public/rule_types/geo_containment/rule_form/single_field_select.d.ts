import React from 'react';
import type { DataViewField } from '@kbn/data-views-plugin/public';
interface Props {
    isInvalid?: boolean;
    placeholder: string;
    value: string | null | undefined;
    onChange: (fieldName?: string) => void;
    fields: DataViewField[];
}
export declare function SingleFieldSelect({ isInvalid, placeholder, value, onChange, fields }: Props): React.JSX.Element;
export {};
