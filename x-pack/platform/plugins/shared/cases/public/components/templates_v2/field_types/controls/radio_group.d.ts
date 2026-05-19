import type { z } from '@kbn/zod/v4';
import React from 'react';
import type { RadioGroupFieldSchema, ConditionRenderProps } from '../../../../../common/types/domain/template/fields';
type RadioGroupProps = z.infer<typeof RadioGroupFieldSchema> & ConditionRenderProps;
export declare const RadioGroup: React.FC<RadioGroupProps>;
export {};
