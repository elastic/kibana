/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { DashboardLink } from './dashboard_link';
import * as i18n from './translations';

interface DashboardAttachmentEventProps {
  attachmentId: string;
}

export const DashboardAttachmentEvent = ({ attachmentId }: DashboardAttachmentEventProps) => {
  return (
    <>
      {i18n.ADDED_DASHBOARD}{' '}
      <DashboardLink
        attachmentId={attachmentId}
        data-test-subj={`dashboard-attachment-link-${attachmentId}`}
      />
    </>
  );
};

DashboardAttachmentEvent.displayName = 'DashboardAttachmentEvent';
