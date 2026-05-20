import type { estypes } from '@elastic/elasticsearch';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { AnalyticsJobType } from '../../../analytics_management/hooks/use_create_analytics_form/state';
export declare const CATEGORICAL_TYPES: Set<string>;
export declare const shouldAddAsDepVarOption: (fieldId: string, fieldType: ES_FIELD_TYPES | estypes.MappingRuntimeField["type"], jobType: AnalyticsJobType) => boolean | undefined;
export declare const handleExplainErrorMessage: (errorMessage: string, sourceIndex: string, jobType: AnalyticsJobType) => {
    maxDistinctValuesErrorMessage: string | undefined;
    unsupportedFieldsErrorMessage: string | undefined;
    toastNotificationDanger: {
        title: string;
        text: string;
    } | undefined;
    toastNotificationWarning: string | undefined;
};
