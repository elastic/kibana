import type { FieldSelectionItem } from '@kbn/ml-data-frame-analytics-utils';
import type { State } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import type { MlApi } from '../../../../../services/ml_api_service';
export declare const fetchExplainData: (mlApi: MlApi, formState: State["form"]) => Promise<{
    success: boolean;
    expectedMemory: string;
    fieldSelection: FieldSelectionItem[];
    errorMessage: string;
    errorReason: string;
    noDocsContainMappedFields: boolean;
}>;
