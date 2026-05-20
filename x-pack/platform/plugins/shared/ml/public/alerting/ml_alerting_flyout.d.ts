import type { FC } from 'react';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { JobId } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlAnomalyDetectionAlertRule, MlAnomalyDetectionAlertParams } from '@kbn/ml-common-types/alerts';
import type { FocusTrapProps } from '../application/util/create_focus_trap_props';
interface MlAnomalyAlertFlyoutProps {
    initialAlert?: MlAnomalyDetectionAlertRule & Rule;
    jobIds?: JobId[];
    initialParams?: Partial<MlAnomalyDetectionAlertParams>;
    onSave?: () => void;
    onCloseFlyout: () => void;
    focusTrapProps?: FocusTrapProps;
}
/**
 * Invoke alerting flyout from the ML plugin context.
 * @param initialAlert
 * @param jobIds
 * @param onCloseFlyout
 * @param onSave
 * @constructor
 */
export declare const MlAnomalyAlertFlyout: FC<MlAnomalyAlertFlyoutProps>;
interface JobListMlAnomalyAlertFlyoutProps {
    setShowFunction: (callback: Function) => void;
    unsetShowFunction: () => void;
    onSave: () => void;
}
/**
 * Component to wire the Alerting flyout with the Job list view.
 * @param setShowFunction
 * @param unsetShowFunction
 * @constructor
 */
export declare const JobListMlAnomalyAlertFlyout: FC<JobListMlAnomalyAlertFlyoutProps>;
interface EditRuleFlyoutProps {
    initialAlert: MlAnomalyDetectionAlertRule & Rule;
    onSave: () => void;
}
export declare const EditAlertRule: FC<EditRuleFlyoutProps>;
export {};
