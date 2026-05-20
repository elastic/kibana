import type { FC } from 'react';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { MlCapabilities } from '@kbn/ml-common-types/capabilities';
import type { MlAnomalyDetectionAlertParams } from '@kbn/ml-common-types/alerts';
import type { MlCoreSetup } from '../../plugin';
export type MlAnomalyAlertTriggerProps = RuleTypeParamsExpressionProps<MlAnomalyDetectionAlertParams> & {
    getStartServices: MlCoreSetup['getStartServices'];
    mlCapabilities: MlCapabilities;
};
declare const MlAnomalyAlertTrigger: FC<MlAnomalyAlertTriggerProps>;
export default MlAnomalyAlertTrigger;
