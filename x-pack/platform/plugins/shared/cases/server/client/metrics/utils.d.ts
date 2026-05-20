import type { CasesMetricsRequest } from '../../../common/types/api';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import type { GetCaseMetricsParams, MetricsHandler } from './types';
export declare const buildHandlers: (params: GetCaseMetricsParams | CasesMetricsRequest, casesClient: CasesClient, clientArgs: CasesClientArgs) => Set<MetricsHandler<unknown>>;
