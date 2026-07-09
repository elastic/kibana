/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
  copyToClipboard,
} from '@elastic/eui';
import { omit } from 'lodash';
import type { Streams } from '@kbn/streams-schema';
import { Streams as StreamsSchema, getParentId } from '@kbn/streams-schema';
import type { CoreStart } from '@kbn/core/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { IndexManagementLocatorParams } from '@kbn/index-management-shared-types';
import { buildRequestPreviewCodeContent } from '../shared/utils';
import { useStreamsAppRouter } from '../../../../hooks/use_streams_app_router';
import { useTimeRange } from '../../../../hooks/use_time_range';

interface LifecycleTabEditAction {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  'data-test-subj': string;
}

interface LifecycleTabLabelWithActionsProps {
  showActions: boolean;
  onCopy: () => void;
  editAction?: LifecycleTabEditAction;
}

export const LifecycleTabLabelWithActions = ({
  showActions,
  onCopy,
  editAction,
}: LifecycleTabLabelWithActionsProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const menuItems: React.ReactElement[] = [
    <EuiContextMenuItem
      key="copy"
      icon="copy"
      onClick={() => {
        setIsOpen(false);
        onCopy();
      }}
      data-test-subj="streamsLifecycleTabCopyApiRequest"
    >
      {i18n.translate('xpack.streams.lifecycleTab.actions.copyRequest', {
        defaultMessage: 'Copy lifecycle API request',
      })}
    </EuiContextMenuItem>,
  ];

  if (editAction) {
    menuItems.push(
      <EuiContextMenuItem
        key="edit"
        icon="gear"
        disabled={editAction.disabled}
        onClick={() => {
          if (editAction.disabled) return;
          setIsOpen(false);
          editAction.onClick();
        }}
        data-test-subj={editAction['data-test-subj']}
      >
        {editAction.label}
      </EuiContextMenuItem>
    );
  }

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiToolTip
        content={i18n.translate('xpack.streams.managementTab.lifecycle.tooltip', {
          defaultMessage:
            'Control how long data stays in this stream. Set a custom duration or apply a shared policy.',
        })}
      >
        <EuiFlexItem grow={false} data-test-subj="retentionTab" tabIndex={0}>
          {i18n.translate('xpack.streams.streamDetailView.lifecycleTab', {
            defaultMessage: 'Data lifecycle',
          })}
        </EuiFlexItem>
      </EuiToolTip>
      <EuiFlexItem grow={false}>
        {showActions && (
          <EuiPopover
            isOpen={isOpen}
            closePopover={() => setIsOpen(false)}
            aria-label={i18n.translate('xpack.streams.lifecycleTab.actions.popoverAriaLabel', {
              defaultMessage: 'Data lifecycle tab actions',
            })}
            button={
              <EuiToolTip
                content={i18n.translate('xpack.streams.lifecycleTab.actions.ariaLabel', {
                  defaultMessage: 'More actions',
                })}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  iconType="ellipsis"
                  aria-label={i18n.translate('xpack.streams.lifecycleTab.actions.ariaLabel', {
                    defaultMessage: 'More actions',
                  })}
                  onClick={() => setIsOpen(!isOpen)}
                  size="xs"
                  display="empty"
                  data-test-subj="streamsLifecycleTabActionsButton"
                />
              </EuiToolTip>
            }
            anchorPosition="downLeft"
            panelPaddingSize="none"
          >
            <EuiContextMenuPanel items={menuItems} />
          </EuiPopover>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface LifecycleTabLabelProps {
  definition: Streams.ingest.all.GetResponse;
  showActions: boolean;
  notifications: CoreStart['notifications'];
  share: SharePublicStart;
}

export const LifecycleTabLabel = ({
  definition,
  showActions,
  notifications,
  share,
}: LifecycleTabLabelProps) => {
  const router = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const indexManagementLocator = share.url.locators.get<IndexManagementLocatorParams>(
    'INDEX_MANAGEMENT_LOCATOR_ID'
  );

  const isClassic = StreamsSchema.ClassicStream.GetResponse.is(definition);
  const isWired = StreamsSchema.WiredStream.GetResponse.is(definition);

  const editAction = useMemo((): LifecycleTabEditAction | undefined => {
    if (isClassic) {
      const templateName = definition.elasticsearch_assets?.indexTemplate;
      if (!indexManagementLocator) {
        return undefined;
      }

      return {
        label: i18n.translate('xpack.streams.lifecycleTab.actions.editIndexTemplate', {
          defaultMessage: 'Edit index template',
        }),
        disabled: !templateName,
        onClick: async () => {
          if (!templateName) {
            return;
          }
          const url = await indexManagementLocator.getUrl({
            page: 'index_template_edit',
            indexTemplate: templateName,
          });
          window.open(url, '_blank');
        },
        'data-test-subj': 'streamsLifecycleTabEditIndexTemplate',
      };
    }

    if (isWired) {
      const parentId = getParentId(definition.stream.name);
      if (!parentId) {
        return undefined;
      }

      return {
        label: i18n.translate('xpack.streams.lifecycleTab.actions.editParentStream', {
          defaultMessage: 'Edit parent stream',
        }),
        onClick: () => {
          router.push('/{key}/management/{tab}', {
            path: { key: parentId, tab: 'lifecycle' },
            query: { rangeFrom, rangeTo },
          });
        },
        'data-test-subj': 'streamsLifecycleTabEditParentStream',
      };
    }

    return undefined;
  }, [definition, indexManagementLocator, isClassic, isWired, rangeFrom, rangeTo, router]);

  return (
    <LifecycleTabLabelWithActions
      showActions={showActions}
      onCopy={() => {
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
      }}
      editAction={editAction}
    />
  );
};
