import type { CasesClientGetAlertsResponse } from './types';
import type { CasesClientArgs } from '..';
import type { AlertInfo } from '../../common/types';
export declare const getAlerts: (alertsInfo: AlertInfo[], clientArgs: CasesClientArgs) => Promise<CasesClientGetAlertsResponse>;
