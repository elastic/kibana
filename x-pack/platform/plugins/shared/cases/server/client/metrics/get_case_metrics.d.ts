import type { SingleCaseMetricsResponse } from '../../../common/types/api';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import type { GetCaseMetricsParams } from './types';
export declare const getCaseMetrics: ({ caseId, features }: GetCaseMetricsParams, casesClient: CasesClient, clientArgs: CasesClientArgs) => Promise<SingleCaseMetricsResponse>;
