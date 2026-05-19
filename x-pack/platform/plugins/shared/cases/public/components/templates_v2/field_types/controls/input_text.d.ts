import type { z } from '@kbn/zod/v4';
import React from 'react';
import type { InputTextFieldSchema, ConditionRenderProps } from '../../../../../common/types/domain/template/fields';
type InputTextProps = z.infer<typeof InputTextFieldSchema> & ConditionRenderProps;
export declare const InputText: {
    ({ label, name, type, isRequired, patternValidation, minLength, maxLength, }: InputTextProps): React.JSX.Element;
    displayName: string;
};
export {};
