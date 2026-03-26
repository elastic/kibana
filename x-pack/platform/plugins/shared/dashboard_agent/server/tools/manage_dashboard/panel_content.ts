/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AttachmentPanel } from '@kbn/dashboard-agent-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-plugin/common/constants';

export type DashboardPanelContent = Pick<AttachmentPanel, 'type' | 'config'>;

/** Panel input that may or may not have a uid assigned yet */
export type DashboardPanelInput = Omit<AttachmentPanel, 'uid'> & { uid?: string };

export const normalizeDashboardPanel = ({
  uid,
  grid,
  type,
  config,
}: DashboardPanelInput): AttachmentPanel => {
  return {
    uid: uid ?? uuidv4(),
    grid,
    type,
    config:
      type === LENS_EMBEDDABLE_TYPE && !('attributes' in config)
        ? {
            attributes: config,
          }
        : config,
  };
};
