import type { FindFileStructureResponse } from '@kbn/file-upload-common';
import type { SupportedFieldType } from '../../../../../common/types';
export declare function getFieldNames(results: FindFileStructureResponse): string[];
export declare function getSupportedFieldType(type: string): SupportedFieldType;
