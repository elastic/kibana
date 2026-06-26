/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  POC_APPLICATION_ATTACH_ATTACHMENT,
  POC_ATTACH_FLIGHT_ICON,
} from './attachment_coordinator/coordinator_bridge';
import { ApplicationAttachmentButton } from './application_attachment_button';

/**
 * POC harness for Checkpoint 3 — mounts ApplicationAttachmentButton in the application column.
 * Replace with Discover/Dashboard header wiring in a follow-up pass.
 */
export const ApplicationAttachmentHarness: React.FC = () => {
  const getAttachment = useCallback(() => POC_APPLICATION_ATTACH_ATTACHMENT, []);

  return (
    <ApplicationAttachmentButton
      getAttachment={getAttachment}
      iconType={POC_ATTACH_FLIGHT_ICON}
    />
  );
};
