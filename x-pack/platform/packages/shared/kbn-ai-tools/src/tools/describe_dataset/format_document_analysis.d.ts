import type { DocumentAnalysis, FormattedDocumentAnalysis } from './document_analysis';
interface FormatDocumentAnalysisOptions {
    dropEmpty?: boolean;
    dropUnmapped?: boolean;
    limit?: number;
}
export declare function formatDocumentAnalysis(analysis: DocumentAnalysis, options?: FormatDocumentAnalysisOptions): FormattedDocumentAnalysis;
export {};
