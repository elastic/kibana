/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { StyleIsolation } from '../../common/config';
import { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE } from '../../common/constants';
import { createAdaptiveUiViewUiDefinition } from './adaptive_ui_view';

export const registerAdaptiveUiAttachmentRenderers = (
  attachments: AttachmentServiceStartContract,
  core: CoreStart,
  styleIsolation: StyleIsolation
): void => {
  attachments.addAttachmentType(
    ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE,
    createAdaptiveUiViewUiDefinition(core, styleIsolation)
  );
};
