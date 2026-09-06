/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { ActionButton, AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ViewSpec } from '@kbn/adaptive-ui';
import type { StyleIsolation } from '../../common/config';
import type { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE } from '../../common/constants';
import { AdaptiveViewContainer } from '../renderers/view_renderer';

export type AdaptiveUiViewAttachment = Attachment<
  typeof ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE,
  ViewSpec
>;

const defaultLabel = i18n.translate('xpack.adaptiveUi.attachments.view.label', {
  defaultMessage: 'View',
});

export const createAdaptiveUiViewUiDefinition = (
  core: CoreStart,
  styleIsolation: StyleIsolation = 'shadow'
): AttachmentUIDefinition<AdaptiveUiViewAttachment> => ({
  getLabel: (attachment) => attachment.data.title || defaultLabel,
  getIcon: () => 'visualizeApp',
  renderInlineContent: ({ attachment }) => (
    <AdaptiveViewContainer spec={attachment.data} {...{ core, styleIsolation }} framed={false} />
  ),
  renderCanvasContent: ({ attachment }) => (
    <AdaptiveViewContainer spec={attachment.data} {...{ core, styleIsolation }} framed={false} />
  ),
  getActionButtons: ({ isCanvas, openCanvas }) => {
    if (isCanvas || !openCanvas) {
      return [];
    }
    const expand: ActionButton = {
      label: i18n.translate('xpack.adaptiveUi.attachments.view.expand', {
        defaultMessage: 'Expand',
      }),
      icon: 'expand',
      type: ActionButtonType.SECONDARY,
      handler: openCanvas,
    };
    return [expand];
  },
});
