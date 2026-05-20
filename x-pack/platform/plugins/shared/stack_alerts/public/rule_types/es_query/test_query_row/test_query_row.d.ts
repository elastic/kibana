import React from 'react';
import type { ParsedAggregationResults } from '@kbn/triggers-actions-ui-plugin/common';
export interface TestQueryRowProps {
    fetch: () => Promise<{
        testResults: ParsedAggregationResults;
        isGrouped: boolean;
        timeWindow: string;
    }>;
    copyQuery?: () => string;
    hasValidationErrors: boolean;
    showTable?: boolean;
}
export declare const TestQueryRow: React.FC<TestQueryRowProps>;
