import type { TagAttributes } from '../../../common/types';
import { type TagValidation } from '../../../common';
/**
 * Returns the hex representation of a random color (e.g `#F1B7E2`)
 */
export declare const getRandomColor: () => string;
export declare const duplicateTagNameErrorMessage: string;
export declare const managedTagConflictMessage: string;
export declare const validateTag: (tag: TagAttributes) => TagValidation;
export declare const useIfMounted: () => (func?: () => void) => void;
