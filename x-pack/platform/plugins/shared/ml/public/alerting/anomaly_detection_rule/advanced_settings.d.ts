import type { FC } from 'react';
import { type MlAnomalyDetectionAlertAdvancedSettings } from '@kbn/ml-common-types/alerts';
interface AdvancedSettingsProps {
    value: MlAnomalyDetectionAlertAdvancedSettings;
    onChange: (update: Partial<MlAnomalyDetectionAlertAdvancedSettings>) => void;
}
export declare const AdvancedSettings: FC<AdvancedSettingsProps>;
export {};
