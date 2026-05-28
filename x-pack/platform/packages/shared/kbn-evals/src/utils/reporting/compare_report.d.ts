import type { PairedTTestResult } from '@kbn/evals-common';
export declare function formatPairedTTestReport({ runIdA, runIdB, results, significanceThreshold, }: {
    runIdA: string;
    runIdB: string;
    results: PairedTTestResult[];
    significanceThreshold?: number;
}): {
    header: string[];
    summary: string;
    tableOutput: string;
    significantCount: number;
};
