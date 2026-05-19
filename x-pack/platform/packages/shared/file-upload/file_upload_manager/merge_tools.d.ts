import type { FindFileStructureResponse } from '@kbn/file-upload-common';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { FileAnalysis, FileWrapper } from './file_wrapper';
export declare enum CLASH_TYPE {
    MAPPING = 0,
    FORMAT = 1,
    UNSUPPORTED = 2,
    EXISTING_INDEX_MAPPING = 3,
    MANY_NEW_FIELDS = 4,
    MANY_UNUSED_FIELDS = 5
}
export declare enum CLASH_ERROR_TYPE {
    NONE = 0,
    ERROR = 1,
    WARNING = 2,
    INFO = 3
}
export interface MappingClash {
    fieldName: string;
    existingType: string;
    clashingType: {
        fileName: string;
        newType: string;
        fileIndex: number;
    };
}
export interface FileClash {
    fileName: string;
    clash: CLASH_ERROR_TYPE;
    clashType?: CLASH_TYPE;
    newFields?: string[];
    missingFields?: string[];
    commonFields?: string[];
}
interface MergedMappings {
    mergedMappings: MappingTypeMapping;
    mappingClashes: MappingClash[];
    existingIndexChecks?: ExistingIndexChecks;
}
interface FieldsPerFile {
    fileName: string;
    fileIndex: number;
    fields: string[];
}
interface ExistingIndexChecks {
    existingFields: string[];
    newFieldsPerFile: FieldsPerFile[];
    mappingClashes: MappingClash[];
    unmappedFieldsPerFile: FieldsPerFile[];
    commonFieldsPerFile: FieldsPerFile[];
}
export declare function createMergedMappings(files: FileWrapper[], existingIndexMappings: FindFileStructureResponse['mappings'] | null): MergedMappings;
export declare function getMappingClashInfo(mappingClashes: MappingClash[], existingIndexChecks: ExistingIndexChecks | undefined, filesStatus: FileAnalysis[]): FileClash[];
export declare function getFormatClashes(files: FileWrapper[]): FileClash[];
export declare function getFieldsFromMappings(mappings: MappingTypeMapping, allowedTypes?: string[]): {
    name: string;
    value: {
        type: string;
    };
}[];
export {};
