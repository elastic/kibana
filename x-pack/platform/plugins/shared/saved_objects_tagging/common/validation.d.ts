import type { Tag } from './types';
export declare const tagNameMinLength = 2;
export declare const tagNameMaxLength = 50;
export declare const tagDescriptionMaxLength = 100;
export interface TagValidation {
    valid: boolean;
    warnings: string[];
    errors: Partial<Record<keyof Tag, string | undefined>>;
}
export declare const validateTagColor: (color: string) => string | undefined;
export declare const validateTagName: (name: string) => string | undefined;
export declare const validateTagDescription: (description: string) => string | undefined;
