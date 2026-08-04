import type { DocumentStats } from '../../hooks/use_document_count_stats';
/**
 * Creates a hash from the document stats to determine if the document stats have changed.
 */
export declare function createDocumentStatsHash(documentStats: DocumentStats): number;
export declare function createAdditionalConfigHash(additionalStrings?: string[]): number;
