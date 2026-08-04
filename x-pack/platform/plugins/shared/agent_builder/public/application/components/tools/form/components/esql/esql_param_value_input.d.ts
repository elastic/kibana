import { EsqlToolFieldType } from '@kbn/agent-builder-common';
import type { EsqlToolParamValue } from '@kbn/agent-builder-common';
import React from 'react';
export declare const getEmptyValue: (fieldType: EsqlToolFieldType) => EsqlToolParamValue;
export interface EsqlParamValueInputProps {
    type: EsqlToolFieldType;
    value: EsqlToolParamValue | undefined;
    onChange: (value: EsqlToolParamValue | undefined) => void;
    inputRef?: React.Ref<HTMLInputElement>;
    disabled?: boolean;
    compressed?: boolean;
    fullWidth?: boolean;
    placeholder?: string;
    isInvalid?: boolean;
    'data-test-subj'?: string;
}
export declare const EsqlParamValueInput: React.FC<EsqlParamValueInputProps>;
