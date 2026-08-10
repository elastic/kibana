/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useConsumeLensReturn } from './use_consume_lens_return';

interface LensAttachReturnConsumerProps {
  caseId: string;
}

/**
 * Renders nothing; mounted on the case view so a Lens "Save and return" round
 * trip auto-attaches the saved object to this case. Gate the mount on
 * `xpack.cases.attachments.enabled` at the call site.
 */
export const LensAttachReturnConsumer: React.FC<LensAttachReturnConsumerProps> = React.memo(
  ({ caseId }) => {
    useConsumeLensReturn({ caseId });
    return null;
  }
);
LensAttachReturnConsumer.displayName = 'LensAttachReturnConsumer';
