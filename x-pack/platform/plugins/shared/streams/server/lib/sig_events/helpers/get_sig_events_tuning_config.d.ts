import type { IUiSettingsClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { type SigEventsTuningConfig } from '../../../../common/sig_events_tuning_config';
/**
 * Reads the tuning config from global uiSettings, merging with defaults
 * for any missing keys. If the stored config is invalid, logs a warning
 * and returns full defaults.
 */
export declare function getSigEventsTuningConfig(globalUiSettingsClient: IUiSettingsClient, logger: Logger): Promise<SigEventsTuningConfig>;
