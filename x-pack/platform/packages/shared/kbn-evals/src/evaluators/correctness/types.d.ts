export interface CorrectnessAnalysis {
    summary: {
        factual_accuracy_summary: string;
        relevance_summary: string;
        sequence_accuracy_summary: string;
    };
    analysis: Array<{
        claim: string;
        centrality: 'central' | 'peripheral';
        centrality_reason: string;
        verdict: 'FULLY_SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'CONTRADICTED' | 'NOT_IN_GROUND_TRUTH';
        sequence_match: 'MATCH' | 'MISMATCH' | 'NOT_APPLICABLE';
        justification_snippet: string | undefined;
        explanation: string;
    }>;
}
