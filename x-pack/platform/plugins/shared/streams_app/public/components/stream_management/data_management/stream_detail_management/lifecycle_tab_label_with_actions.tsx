/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { copyToClipboard } from '@elastic/eui';
import { omit } from 'lodash';
import type { Streams } from '@kbn/streams-schema';
import type { CoreStart } from '@kbn/core/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { IndexManagementLocatorParams } from '@kbn/index-management-shared-types';
import type { AppHeaderTabAction, AppHeaderTabActions } from '@kbn/app-header';
import { buildRequestPreviewCodeContent } from '../shared/utils';

interface LifecycleTabActionsParams {
  definition: Streams.ingest.all.GetResponse;
  indexTemplateName?: string;
  notifications: CoreStart['notifications'];
  share: SharePublicStart;
}

/**
 * Builds the ellipsis actions for the "Data lifecycle" tab (copy the lifecycle API request and edit
 * the backing index template). Rendered by the shared app header tab as an `actions` popover.
 */
export const buildLifecycleTabActions = ({
  definition,
  indexTemplateName,
  notifications,
  share,
}: LifecycleTabActionsParams): AppHeaderTabActions => {
  const indexManagementLocator = share.url.locators.get<IndexManagementLocatorParams>(
    'INDEX_MANAGEMENT_LOCATOR_ID'
  );

  const items: AppHeaderTabAction[] = [
    {
      id: 'copy',
      label: i18n.translate('xpack.streams.lifecycleTab.actions.copyRequest', {
        defaultMessage: 'Copy lifecycle API request',
      }),
      iconType: 'copy',
      'data-test-subj': 'streamsLifecycleTabCopyApiRequest',
      onClick: () => {
        const body = {
          ingest: {
            ...definition.stream.ingest,
            processing: omit(definition.stream.ingest.processing, 'updated_at'),
            lifecycle: definition.stream.ingest.lifecycle,
          },
        };
        const content = buildRequestPreviewCodeContent({
          method: 'PUT',
          url: `/api/streams/${definition.stream.name}/_ingest`,
          body,
        });
        const ok = copyToClipboard(content);
        if (ok) {
          notifications.toasts.addSuccess({
            title: i18n.translate('xpack.streams.lifecycleTab.actions.copySuccess', {
              defaultMessage: 'Copied lifecycle API request',
            }),
          });
        }
      },
    },
  ];

  if (indexManagementLocator) {
    items.push({
      id: 'editTemplate',
      label: i18n.translate('xpack.streams.lifecycleTab.actions.editIndexTemplate', {
        defaultMessage: 'Edit index template',
      }),
      iconType: 'gear',
      disabled: !indexTemplateName,
      'data-test-subj': 'streamsLifecycleTabEditIndexTemplate',
      onClick: async () => {
        if (!indexTemplateName) return;
        const url = await indexManagementLocator.getUrl({
          page: 'index_template_edit',
          indexTemplate: indexTemplateName,
        });
        window.open(url, '_blank');
      },
    });
  }

  return {
    ariaLabel: i18n.translate('xpack.streams.lifecycleTab.actions.ariaLabel', {
      defaultMessage: 'More actions',
    }),
    'data-test-subj': 'streamsLifecycleTabActionsButton',
    items,
  };
};
