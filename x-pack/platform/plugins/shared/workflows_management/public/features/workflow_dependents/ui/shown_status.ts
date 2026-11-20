/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImpactStatus } from '../../../../common/lib/workflow_dependents/types';

/** A status as shown: `turnedOff` is a turned-off caller that the save would otherwise break. */
export type ShownStatus = ImpactStatus | 'turnedOff';

/** The status to show for a caller; a turned-off one has no runs for the save to break. */
export const getShownStatus = ({
  enabled,
  status,
}: {
  enabled: boolean;
  status: ImpactStatus;
}): ShownStatus =>
  !enabled && (status === 'breaking' || status === 'warning') ? 'turnedOff' : status;
