import type { FindFileStructureResponse } from '@kbn/file-upload-common';
import type { FileBasedFieldVisConfig } from '../stats_table/types';
export declare function createFields(results: FindFileStructureResponse): {
    fields: (FileBasedFieldVisConfig | {
        fieldName: string;
        type: "text" | "unknown";
        stats: {
            mean: number;
            count: number;
            sampleCount: number;
            cardinality: number;
        };
    })[];
    totalFieldsCount: number;
    totalMetricFieldsCount: number;
};
