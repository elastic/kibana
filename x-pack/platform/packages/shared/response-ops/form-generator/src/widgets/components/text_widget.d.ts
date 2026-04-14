import React from 'react';
import type { EuiFieldTextProps } from '@elastic/eui';
import type { z } from '@kbn/zod/v4';
import type { BaseWidgetProps } from '../types';
type TextWidgetProps = BaseWidgetProps<z.ZodString, EuiFieldTextProps>;
export declare const TextWidget: React.FC<TextWidgetProps>;
export {};
