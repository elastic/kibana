import React from 'react';
import type { EuiFieldTextProps } from '@elastic/eui';
import type { z } from '@kbn/zod/v4';
import type { BaseWidgetProps } from '../types';
type HiddenWidgetProps = BaseWidgetProps<z.ZodString, EuiFieldTextProps>;
export declare const HiddenWidget: React.FC<HiddenWidgetProps>;
export {};
