import type { Client } from '@elastic/elasticsearch';
type XpackUsageResponse = Awaited<ReturnType<Client['xpack']['usage']>>;
type XpackUsageSecurity = XpackUsageResponse['security'];
export type EsSecurityConfig = Pick<XpackUsageSecurity, 'operator_privileges'>;
export {};
