import type { RulesSettingsAlertDeleteProperties } from '@kbn/alerting-types';
import type { SpaceId } from '@kbn/core-spaces-common';
import { type AlertDeletionContext } from '../alert_deletion_client';
export declare const deleteAlertsForSpace: (context: AlertDeletionContext, settings: RulesSettingsAlertDeleteProperties, spaceId: SpaceId, signal: AbortSignal) => Promise<{
    numAlertsDeleted: number;
    errors?: string[];
}>;
