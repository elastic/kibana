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
import { Streams as StreamsSchema, getParentId } from '@kbn/streams-schema';
import type { CoreStart } from '@kbn/core/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { IndexManagementLocatorParams } from '@kbn/index-management-shared-types';
import type { AppHeaderTabAction, AppHeaderTabActions } from '@kbn/app-header';
import { buildRequestPreviewCodeContent } from '../shared/utils';
import type { StatefulStreamsAppRouter } from '../../../../hooks/use_streams_app_router';

interface LifecycleTabActionsParams {
  definition: Streams.ingest.all.GetResponse;
  notifications: CoreStart['notifications'];
  share: SharePublicStart;
  router: StatefulStreamsAppRouter;
  timeRange: { rangeFrom: string; rangeTo: string };
  onImportFromStream?: () => void;
  isImportFromStreamDisabled?: boolean;
}

/**
 * Builds the ellipsis actions for the "Data lifecycle" tab: copy the lifecycle API request, import
 * another stream's lifecycle, plus a type-specific edit action (classic -> edit the backing index
 * template, wired -> edit the parent stream). Rendered by the shared app header tab as an `actions`
 * popover.
 */
export const buildLifecycleTabActions = ({
  definition,
  notifications,
  share,
  router,
  timeRange,
  onImportFromStream,
  isImportFromStreamDisabled = false,
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

  if (definition.privileges.lifecycle && definition.privileges.manage_failure_store) {
    items.push({
      id: 'importFromStream',
      label: i18n.translate('xpack.streams.lifecycleTab.actions.importFromStream', {
        defaultMessage: 'Import from another stream',
      }),
      iconType: 'importAction',
      disabled: !onImportFromStream || isImportFromStreamDisabled,
      'data-test-subj': 'streamsLifecycleTabImportFromStream',
      onClick: () => {
        if (isImportFromStreamDisabled) {
          return;
        }
        onImportFromStream?.();
      },
    });
  }

  if (StreamsSchema.ClassicStream.GetResponse.is(definition) && indexManagementLocator) {
    const indexTemplateName = definition.elasticsearch_assets?.indexTemplate;
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

  if (StreamsSchema.WiredStream.GetResponse.is(definition)) {
    const parentId = getParentId(definition.stream.name);
    if (parentId) {
      items.push({
        id: 'editParentStream',
        label: i18n.translate('xpack.streams.lifecycleTab.actions.editParentStream', {
          defaultMessage: 'Edit parent stream',
        }),
        iconType: 'gear',
        'data-test-subj': 'streamsLifecycleTabEditParentStream',
        onClick: () => {
          router.push('/{key}/management/{tab}', {
            path: { key: parentId, tab: 'lifecycle' },
            query: { rangeFrom: timeRange.rangeFrom, rangeTo: timeRange.rangeTo },
          });
        },
      });
    }
  }

  return {
    ariaLabel: i18n.translate('xpack.streams.lifecycleTab.actions.ariaLabel', {
      defaultMessage: 'More actions',
    }),
    'data-test-subj': 'streamsLifecycleTabActionsButton',
    items,
  };
};
