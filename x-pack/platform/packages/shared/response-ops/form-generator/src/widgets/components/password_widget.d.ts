import React from 'react';
import type { EuiFieldPasswordProps } from '@elastic/eui';
import type { z } from '@kbn/zod/v4';
import type { BaseWidgetProps } from '../types';
type PasswordWidgetProps = BaseWidgetProps<z.ZodString, EuiFieldPasswordProps>;
export declare const PasswordWidget: React.FC<PasswordWidgetProps>;
export {};
