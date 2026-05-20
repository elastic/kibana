import type { estypes } from '@elastic/elasticsearch';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { Token, CategorizationAnalyzer } from '../common/types/categories';
/**
 * Provides methods for checking whether categories can be
 * produced from a field.
 *
 * @export
 * @param client - IScopedClusterClient
 */
export declare function categorizationExamplesProvider(client: IScopedClusterClient): {
    validateCategoryExamples: (indexPatternTitle: string, query: estypes.QueryDslQueryContainer, size: number, categorizationFieldName: string, timeField: string | undefined, start: number, end: number, analyzer: CategorizationAnalyzer, runtimeMappings: RuntimeMappings | undefined, indicesOptions: estypes.IndicesOptions | undefined, projectRouting: string | undefined, includeExamples?: boolean) => Promise<{
        overallValidStatus: import("../common/constants/categorization").CATEGORY_EXAMPLES_VALIDATION_STATUS;
        validationChecks: import("../common/types/categories").FieldExampleCheck[];
        sampleSize: number;
        examples?: undefined;
    } | {
        overallValidStatus: import("../common/constants/categorization").CATEGORY_EXAMPLES_VALIDATION_STATUS;
        validationChecks: import("../common/types/categories").FieldExampleCheck[];
        sampleSize: number;
        examples: {
            text: string;
            tokens: Token[];
        }[];
    }>;
};
