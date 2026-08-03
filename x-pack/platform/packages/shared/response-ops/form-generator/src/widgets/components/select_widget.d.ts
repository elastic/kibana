import React from 'react';
import { z } from '@kbn/zod/v4';
import type { EuiSelectProps } from '@elastic/eui';
import type { BaseWidgetProps } from '../types';
type SelectWidgetProps = BaseWidgetProps<z.ZodEnum<any>, EuiSelectProps>;
export declare const getOptions: (schema: z.ZodEnum) => EuiSelectProps["options"];
export declare const SelectWidget: React.FC<SelectWidgetProps>;
export {};
