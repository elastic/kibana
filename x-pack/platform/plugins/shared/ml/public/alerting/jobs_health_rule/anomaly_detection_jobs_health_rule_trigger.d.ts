import type { FC } from 'react';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { MlAnomalyDetectionJobsHealthRuleParams } from '@kbn/ml-common-types/alerts';
export type MlAnomalyAlertTriggerProps = RuleTypeParamsExpressionProps<MlAnomalyDetectionJobsHealthRuleParams>;
declare const AnomalyDetectionJobsHealthRuleTrigger: FC<MlAnomalyAlertTriggerProps>;
export default AnomalyDetectionJobsHealthRuleTrigger;
