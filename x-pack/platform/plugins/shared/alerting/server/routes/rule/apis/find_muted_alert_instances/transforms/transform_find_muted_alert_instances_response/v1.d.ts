import type { FindMutedAlertInstancesResponseV1 } from '../../../../../../../common/routes/rule/apis/find_muted_alert_instances';
import type { FindMutedAlertsResult } from '../../../../../../application/rule/methods/find_muted_alerts';
export declare const transformFindMutedAlertInstancesResponse: (result: FindMutedAlertsResult) => FindMutedAlertInstancesResponseV1;
