import type { RulesSettingsAlertDeleteProperties } from '@kbn/alerting-types';
import type { SpaceId } from '@kbn/core-spaces-common';
import { type AlertDeletionContext } from '../alert_deletion_client';
export declare const previewTask: (context: AlertDeletionContext, settings: RulesSettingsAlertDeleteProperties, spaceId: SpaceId) => Promise<number>;
