import { type ExistingFieldsReader } from '@kbn/unified-field-list/src/hooks/use_existing_fields';
import type { IndexPattern } from '@kbn/lens-common';
/**
 * Checks if the provided field contains data (works for meta field)
 */
export declare function fieldContainsData(fieldName: string, indexPattern: IndexPattern, hasFieldData: ExistingFieldsReader['hasFieldData']): boolean;
