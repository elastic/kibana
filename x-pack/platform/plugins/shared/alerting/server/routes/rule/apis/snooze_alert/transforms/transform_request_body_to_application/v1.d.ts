import type { SnoozeAlertInstanceBody } from '../../../../../../application/rule/methods/snooze_alert_instance/types';
import type { SnoozeAlertRequestBodyV1 } from '../../../../../../../common/routes/rule/apis/snooze_alert';
export declare const transformRequestBodyToApplication: (body: SnoozeAlertRequestBodyV1) => SnoozeAlertInstanceBody;
