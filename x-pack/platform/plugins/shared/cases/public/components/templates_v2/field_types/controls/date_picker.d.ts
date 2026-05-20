import type { z } from '@kbn/zod/v4';
import React from 'react';
import { type DatePickerFieldSchema, type ConditionRenderProps } from '../../../../../common/types/domain/template/fields';
type DatePickerProps = z.infer<typeof DatePickerFieldSchema> & ConditionRenderProps;
export declare const DatePicker: React.FC<DatePickerProps>;
export {};
