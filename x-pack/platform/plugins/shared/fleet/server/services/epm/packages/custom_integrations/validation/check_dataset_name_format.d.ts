import type { CustomPackageDatasetConfiguration } from '../../install';
export declare const checkDatasetsNameFormat: (datasets: CustomPackageDatasetConfiguration[], integrationName: string) => void;
export declare class DatasetNamePrefixError extends Error {
    constructor(message?: string);
}
