import type { InlineField, RefField } from './fields';
export declare const validateExtendedFields: (extendedFields: Record<string, string>, fields: Array<RefField | InlineField>) => string[];
