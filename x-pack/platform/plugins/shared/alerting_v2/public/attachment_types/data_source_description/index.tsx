/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import {
  DATA_SOURCE_DESCRIPTION_TYPE,
  type DataSourceDescriptionAttachment,
} from '../../../common/attachment_types';
import { DataSourceDescriptionInlineContent } from './inline_content';
import { DataSourceDescriptionCanvasContent } from './canvas_content';

const DISCOVER_APP_LOCATOR = 'DISCOVER_APP_LOCATOR';

export const registerDataSourceDescriptionAttachment = ({
  agentBuilder,
  share,
  data,
}: {
  agentBuilder: AgentBuilderPluginStart;
  share: SharePluginStart;
  data: DataPublicPluginStart;
}) => {
  const discoverLocator = share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);

  agentBuilder.attachments.addAttachmentType<DataSourceDescriptionAttachment>(
    DATA_SOURCE_DESCRIPTION_TYPE,
    {
      getLabel: (attachment) => attachment.data?.index ?? 'Data source',
      getIcon: () => 'discoverApp',
      renderInlineContent: (props) => <DataSourceDescriptionInlineContent {...props} />,
      renderCanvasContent: (props, callbacks) => (
        <DataSourceDescriptionCanvasContent
          {...props}
          registerActionButtons={callbacks.registerActionButtons}
          search={data.search.search}
          discoverLocator={discoverLocator}
        />
      ),
      getActionButtons: ({ openCanvas, isCanvas }) => {
        const buttons = [];

        if (!isCanvas && openCanvas) {
          buttons.push({
            label: i18n.translate(
              'xpack.alertingVTwo.attachments.dataSourceDescription.previewActionLabel',
              { defaultMessage: 'Preview' }
            ),
            icon: 'eye',
            type: ActionButtonType.SECONDARY,
            handler: () => openCanvas(),
          });
        }

        if (isCanvas && discoverLocator) {
          buttons.push({
            label: i18n.translate(
              'xpack.alertingVTwo.attachments.dataSourceDescription.viewInDiscoverLabel',
              { defaultMessage: 'View in Discover' }
            ),
            icon: 'discoverApp',
            type: ActionButtonType.PRIMARY,
            handler: (attachment: DataSourceDescriptionAttachment) => {
              const url = discoverLocator.getRedirectUrl({
                query: { esql: attachment.data.esqlQuery },
                timeRange: {
                  from: attachment.data.timeRange.start,
                  to: attachment.data.timeRange.end,
                },
              });
              if (url) {
                window.open(url, '_blank');
              }
            },
          });
        }

        return buttons;
      },
    }
  );
};
