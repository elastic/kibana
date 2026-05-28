export interface GroundednessAnalysis {
    summary_verdict: 'GROUNDED' | 'GROUNDED_WITH_DISCLOSURE' | 'MINOR_HALLUCINATIONS' | 'MAJOR_HALLUCINATIONS';
    analysis: Array<{
        claim: string;
        centrality: 'central' | 'peripheral';
        centrality_reason: string;
        verdict: 'FULLY_SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'CONTRADICTED' | 'NOT_FOUND' | 'UNGROUNDED_BUT_DISCLOSED';
        evidence: {
            tool_call_id: string | undefined;
            tool_id: string | undefined;
            evidence_snippet: string | undefined;
        } | undefined;
        explanation: string;
    }>;
}
