import type { z } from '@kbn/zod/v4';
import React from 'react';
import type { CheckboxGroupFieldSchema, ConditionRenderProps } from '../../../../../common/types/domain/template/fields';
type CheckboxGroupProps = z.infer<typeof CheckboxGroupFieldSchema> & ConditionRenderProps;
export declare const CheckboxGroup: React.FC<CheckboxGroupProps>;
export {};
