import type { TermsIndexPatternColumn, IndexPatternField } from '@kbn/lens-common';
import type { OperationDefinition } from '..';
export declare function supportsRarityRanking(field?: IndexPatternField): boolean;
export declare function supportsSignificantRanking(field?: IndexPatternField): boolean | undefined;
export declare const termsOperation: OperationDefinition<TermsIndexPatternColumn, 'field', TermsIndexPatternColumn['params']>;
