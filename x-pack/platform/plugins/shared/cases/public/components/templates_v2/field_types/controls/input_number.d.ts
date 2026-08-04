import type { z } from '@kbn/zod/v4';
import React from 'react';
import type { InputNumberFieldSchema, ConditionRenderProps } from '../../../../../common/types/domain/template/fields';
type InputNumberProps = z.infer<typeof InputNumberFieldSchema> & ConditionRenderProps;
export declare const InputNumber: {
    ({ label, name, type, isRequired, isRequiredOnClose, min, max, onConfirm, isSaving, isSaveDisabled, }: InputNumberProps): React.JSX.Element;
    displayName: string;
};
export {};
