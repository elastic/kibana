import React from 'react';
import type { z } from '@kbn/zod/v4';
import type { ToggleFieldSchema, ConditionRenderProps } from '../../../../../common/types/domain/template/fields';
type ToggleProps = z.infer<typeof ToggleFieldSchema> & ConditionRenderProps;
export declare const Toggle: {
    ({ label, name, type, metadata, isRequired, isRequiredOnClose, onConfirm, isSaving, isSaveDisabled, }: ToggleProps): React.JSX.Element;
    displayName: string;
};
export {};
