import React from 'react';
import type { FieldSpec } from '@kbn/data-plugin/common';
interface Props {
    value: string;
    indexPattern: string;
    fieldPrefix: string;
    onChange: (newValue: string, submit?: boolean) => void;
    placeholder?: string;
    dataTestSubj?: string;
}
/** Exported for testing only **/
export declare const getFieldSpecs: (indexPattern: string, fieldPrefix: string) => FieldSpec[];
export declare const SearchBar: React.FunctionComponent<Props>;
export {};
