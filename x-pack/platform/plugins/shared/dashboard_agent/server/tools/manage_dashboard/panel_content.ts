/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AttachmentPanel } from '@kbn/dashboard-agent-common';

export type DashboardPanelContent = Pick<AttachmentPanel, 'type' | 'config'>;

export const createDashboardPanel = ({
  panelContent,
  grid,
}: {
  panelContent: DashboardPanelContent;
  grid: AttachmentPanel['grid'];
}): AttachmentPanel => ({
  ...panelContent,
  uid: uuidv4(),
  grid,
});
