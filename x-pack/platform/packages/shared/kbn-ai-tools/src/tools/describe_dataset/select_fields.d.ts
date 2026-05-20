import type { DocumentAnalysis } from './document_analysis';
export declare function selectFields(analysis: DocumentAnalysis, { dropEmpty, dropUnmapped, limit }: {
    dropUnmapped: boolean;
    dropEmpty: boolean;
    limit: number;
}): import("./document_analysis").DocumentAnalysisField[];
