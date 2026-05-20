import React from 'react';
import type { FieldArrayWithId } from 'react-hook-form';
import { type EsqlToolFormData } from '../../types/tool_form_types';
interface EsqlParamRowProps {
    index: number;
    paramField: FieldArrayWithId<EsqlToolFormData, 'params', 'id'>;
    removeParamField: (index: number) => void;
}
export declare const EsqlParamRow: React.FC<EsqlParamRowProps>;
export {};
