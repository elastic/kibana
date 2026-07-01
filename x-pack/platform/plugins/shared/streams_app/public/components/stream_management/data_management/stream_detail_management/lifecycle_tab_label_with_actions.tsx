/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
import type { CoreStart } from '@kbn/core/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { IndexManagementLocatorParams } from '@kbn/index-management-shared-types';
import { buildRequestPreviewCodeContent } from '../shared/utils';

interface LifecycleTabLabelWithActionsProps {
  showActions: boolean;
  onCopy: () => void;
  indexTemplateName?: string;
  onEditIndexTemplate?: (templateName: string) => void;
}

export const LifecycleTabLabelWithActions = ({
  showActions,
  onCopy,
  indexTemplateName,
  onEditIndexTemplate,
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

  if (onEditIndexTemplate) {
    menuItems.push(
      <EuiContextMenuItem
        key="editTemplate"
        icon="gear"
        disabled={!indexTemplateName}
        onClick={() => {
          if (!indexTemplateName) return;
          setIsOpen(false);
          onEditIndexTemplate(indexTemplateName);
        }}
        data-test-subj="streamsLifecycleTabEditIndexTemplate"
      >
        {i18n.translate('xpack.streams.lifecycleTab.actions.editIndexTemplate', {
          defaultMessage: 'Edit index template',
        })}
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
  indexTemplateName?: string;
  notifications: CoreStart['notifications'];
  share: SharePublicStart;
}

export const LifecycleTabLabel = ({
  definition,
  showActions,
  indexTemplateName,
  notifications,
  share,
}: LifecycleTabLabelProps) => {
  const indexManagementLocator = share.url.locators.get<IndexManagementLocatorParams>(
    'INDEX_MANAGEMENT_LOCATOR_ID'
  );

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
      indexTemplateName={indexTemplateName}
      onEditIndexTemplate={
        indexManagementLocator
          ? async (templateName) => {
              const url = await indexManagementLocator.getUrl({
                page: 'index_template_edit',
                indexTemplate: templateName,
              });
              window.open(url, '_blank');
            }
          : undefined
      }
    />
  );
};
