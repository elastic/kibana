import { FieldType, type Map } from '../../types/types';
export declare const validIntInput: (value: string | number | boolean | null | Map) => boolean;
export declare const ensureCorrectTyping: (type: FieldType, value: string | number | boolean | null | Map) => string | number | boolean | null | Map;
export declare const ensureStringType: (value: string | number | boolean | null | Map) => string;
export declare const ensureIntType: (value: string | number | boolean | null | Map) => number | null;
export declare const ensureBooleanType: (value: string | number | boolean | null | Map) => boolean;
