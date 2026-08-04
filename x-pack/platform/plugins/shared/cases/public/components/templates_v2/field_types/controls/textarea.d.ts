import type { z } from '@kbn/zod/v4';
import React from 'react';
import type { TextareaFieldSchema, ConditionRenderProps } from '../../../../../common/types/domain/template/fields';
type TextareaProps = z.infer<typeof TextareaFieldSchema> & ConditionRenderProps;
export declare const Textarea: {
    ({ label, name, type, metadata, isRequired, isRequiredOnClose, patternValidation, minLength, maxLength, onConfirm, isSaving, isSaveDisabled, }: TextareaProps): React.JSX.Element;
    displayName: string;
};
export {};
