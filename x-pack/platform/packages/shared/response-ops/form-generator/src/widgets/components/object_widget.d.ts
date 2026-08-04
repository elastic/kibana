import React from 'react';
import type { z } from '@kbn/zod/v4';
import type { BaseWidgetProps } from '../types';
type ObjectWidgetProps = BaseWidgetProps<z.ZodObject<z.ZodRawShape>>;
export declare const ObjectWidget: React.FC<ObjectWidgetProps>;
export {};
