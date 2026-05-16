/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { smlIndexAttachmentStepCommonDefinition } from '../../common/workflow_steps/sml_index_attachment_step';

export const smlIndexAttachmentStepDefinition = createPublicStepDefinition({
  ...smlIndexAttachmentStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/memory').then(({ icon }) => ({ default: icon }))
  ),
});
