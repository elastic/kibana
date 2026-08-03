import type { TagAttributes } from '../../../common/types';
import { type TagValidation } from '../../../common';
export declare const duplicateTagNameErrorMessage: string;
export declare const managedTagConflictMessage: string;
export declare const validateTag: (tag: TagAttributes) => TagValidation;
export declare const useIfMounted: () => (func?: () => void) => void;
