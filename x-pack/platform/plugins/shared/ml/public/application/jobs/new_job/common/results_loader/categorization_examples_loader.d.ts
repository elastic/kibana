import type { DataView } from '@kbn/data-views-plugin/public';
import type { CategorizationJobCreator } from '../job_creator';
export declare class CategorizationExamplesLoader {
    private _jobCreator;
    private _indexPatternTitle;
    private _timeFieldName;
    private _query;
    constructor(jobCreator: CategorizationJobCreator, indexPattern: DataView, query: object);
    loadExamples(): Promise<import("@kbn/ml-category-validator").FieldValidationResults>;
}
