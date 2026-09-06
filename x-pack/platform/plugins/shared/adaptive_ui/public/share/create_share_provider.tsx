/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type {
  AttachmentShareProvider,
  AttachmentShareProviderParams,
} from '@kbn/agent-builder-browser';
import { parseViewSpec, type ViewSpec } from '@kbn/adaptive-ui';
import { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE } from '../../common/constants';
import { ShareMenu } from './share_menu';

/**
 * The framework hands over a spec for any type with `getViewSpec`.
 * `platform.adaptiveUi.view` has none — it renders its own body so it can honor
 * the plugin's `styleIsolation` — so its spec is read from the attachment data.
 */
const resolveSpec = ({ attachment, spec }: AttachmentShareProviderParams): ViewSpec | undefined => {
  if (spec) {
    return spec;
  }
  return attachment.type === ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE
    ? parseViewSpec(attachment.data).spec
    : undefined;
};

export const createAdaptiveUiShareProvider =
  ({ core, isDev }: { core: CoreStart; isDev: boolean }): AttachmentShareProvider =>
  (params) => {
    const spec = resolveSpec(params);
    return spec ? <ShareMenu {...{ spec, core, isDev }} /> : null;
  };
