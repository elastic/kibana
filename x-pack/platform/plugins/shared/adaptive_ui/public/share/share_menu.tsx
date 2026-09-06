/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
  EuiToolTip,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IconType } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import type { ViewSpec } from '@kbn/adaptive-ui';
import { downloadBlob, slugifyTitle } from './download';
import {
  toBlockKitJsonDownload,
  toHtmlDownload,
  toMarkdownDownload,
  toTextDownload,
  toViewSpecJsonDownload,
} from './serializers';
import { fetchViewPng } from './png_client';
import { loadSlackConnectors, type SlackConnector } from './slack_client';
import { SlackShareModal } from './slack_modal';
import { MarkdownMarkIcon } from './markdown_mark_icon';

const SHARE_LABEL = i18n.translate('xpack.adaptiveUi.share.buttonLabel', {
  defaultMessage: 'Share',
});

const DOWNLOAD_FAILURE_TITLE = i18n.translate('xpack.adaptiveUi.share.downloadFailureTitle', {
  defaultMessage: 'Could not export this view',
});

const SLACK_LABEL = i18n.translate('xpack.adaptiveUi.share.slack', {
  defaultMessage: 'Slack',
});

const DOWNLOAD_SECTION = i18n.translate('xpack.adaptiveUi.share.downloadSection', {
  defaultMessage: 'Download',
});

const SEND_SECTION = i18n.translate('xpack.adaptiveUi.share.sendSection', {
  defaultMessage: 'Send',
});

const DEVELOPER_SECTION = i18n.translate('xpack.adaptiveUi.share.developerSection', {
  defaultMessage: 'Developer',
});

const NO_SLACK_CONNECTOR = i18n.translate('xpack.adaptiveUi.share.slackUnavailable', {
  defaultMessage: 'Configure a Slack connector to send views to Slack.',
});

interface Destination {
  id: string;
  /** An element rather than an `IconType` when the mark is not in EUI's set. */
  icon: IconType | ReactElement;
  label: string;
  /** Produces the file contents; async destinations round-trip through a route. */
  run: (spec: ViewSpec, core: CoreStart) => Promise<{ content: BlobPart; type: string }>;
  extension: string;
}

const textDestination = (
  id: string,
  icon: IconType | ReactElement,
  label: string,
  extension: string,
  type: string,
  serialize: (spec: ViewSpec) => string
): Destination => ({
  id,
  icon,
  label,
  extension,
  run: async (spec) => ({ content: serialize(spec), type }),
});

const DESTINATIONS: Destination[] = [
  {
    id: 'png',
    icon: 'image',
    extension: 'png',
    label: i18n.translate('xpack.adaptiveUi.share.png', { defaultMessage: 'PNG' }),
    run: async (spec, core) => ({
      content: await fetchViewPng(core.http, spec),
      type: 'image/png',
    }),
  },
  textDestination(
    'text',
    'text',
    i18n.translate('xpack.adaptiveUi.share.text', { defaultMessage: 'Text' }),
    'txt',
    'text/plain;charset=utf-8',
    toTextDownload
  ),
  textDestination(
    'markdown',
    <EuiIcon type={MarkdownMarkIcon} size="m" aria-hidden={true} />,
    i18n.translate('xpack.adaptiveUi.share.markdown', { defaultMessage: 'Markdown' }),
    'md',
    'text/markdown;charset=utf-8',
    toMarkdownDownload
  ),
  textDestination(
    'html',
    'code',
    i18n.translate('xpack.adaptiveUi.share.html', { defaultMessage: 'HTML' }),
    'html',
    'text/html;charset=utf-8',
    toHtmlDownload
  ),
];

const DEVELOPER_DESTINATIONS: Destination[] = [
  textDestination(
    'viewspec',
    'code',
    i18n.translate('xpack.adaptiveUi.share.viewSpecJson', { defaultMessage: 'ViewSpec' }),
    'viewspec.json',
    'application/json',
    toViewSpecJsonDownload
  ),
  textDestination(
    'blockkit',
    'logoSlack',
    i18n.translate('xpack.adaptiveUi.share.blockKitJson', { defaultMessage: 'Block Kit' }),
    'blockkit.json',
    'application/json',
    toBlockKitJsonDownload
  ),
];

export interface ShareMenuProps {
  spec: ViewSpec;
  core: CoreStart;
  /** Reveals the Developer section. Off outside a development instance. */
  isDev: boolean;
}

export const ShareMenu: React.FC<ShareMenuProps> = ({ spec, core, isDev }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | undefined>();

  const closePopover = useCallback(() => {
    setIsOpen(false);
    setIsDeveloperPanelOpen(false);
  }, []);
  const togglePopover = useCallback(() => setIsOpen((open) => !open), []);

  const [isDeveloperPanelOpen, setIsDeveloperPanelOpen] = useState(false);
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);
  const [slackConnectors, setSlackConnectors] = useState<SlackConnector[]>();

  const basename = useMemo(() => slugifyTitle(spec.title), [spec.title]);

  // Connectors are looked up when the menu first opens, so a conversation full
  // of Adaptive attachments does not fan out connector requests on render.
  useEffect(() => {
    if (!isOpen || slackConnectors) {
      return;
    }
    let cancelled = false;
    loadSlackConnectors(core.http).then(
      (connectors) => !cancelled && setSlackConnectors(connectors),
      () => !cancelled && setSlackConnectors([])
    );
    return () => {
      cancelled = true;
    };
  }, [isOpen, slackConnectors, core.http]);

  const download = useCallback(
    async (destination: Destination) => {
      setPendingId(destination.id);
      try {
        const { content, type } = await destination.run(spec, core);
        downloadBlob(content, `${basename}.${destination.extension}`, type);
        closePopover();
      } catch (error) {
        core.notifications.toasts.addError(error as Error, { title: DOWNLOAD_FAILURE_TITLE });
      } finally {
        setPendingId(undefined);
      }
    },
    [spec, core, basename, closePopover]
  );

  const hasSlackConnector = Boolean(slackConnectors?.length);

  const toItem = (destination: Destination) => (
    <EuiContextMenuItem
      css={{ marginLeft: '12px', minWidth: '140px' }}
      key={destination.id}
      icon={pendingId === destination.id ? <EuiLoadingSpinner size="m" /> : destination.icon}
      disabled={pendingId !== undefined}
      data-test-subj={`adaptiveUiShare-${destination.id}`}
      onClick={() => {
        void download(destination);
      }}
    >
      {destination.label}
    </EuiContextMenuItem>
  );

  const sendItems = [
    <EuiContextMenuItem
      css={{ marginLeft: '12px', minWidth: '140px' }}
      key="slack"
      icon="logoSlack"
      disabled={!hasSlackConnector || pendingId !== undefined}
      toolTipContent={hasSlackConnector ? undefined : NO_SLACK_CONNECTOR}
      data-test-subj="adaptiveUiShare-slack"
      onClick={() => {
        closePopover();
        setIsSlackModalOpen(true);
      }}
    >
      {SLACK_LABEL}
    </EuiContextMenuItem>,
  ];

  const developerEntryItems = [
    <EuiContextMenuItem
      css={{ minWidth: '140px' }}
      key="developer"
      hasPanel
      disabled={pendingId !== undefined}
      data-test-subj="adaptiveUiShare-developer"
      onClick={() => setIsDeveloperPanelOpen(true)}
    >
      {DEVELOPER_SECTION}
    </EuiContextMenuItem>,
  ];

  return (
    <>
      <EuiPopover
        aria-label={SHARE_LABEL}
        button={
          <EuiToolTip content={SHARE_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              aria-label={SHARE_LABEL}
              color="text"
              data-test-subj="adaptiveUiShareButton"
              iconType="share"
              onClick={togglePopover}
              size="s"
              {...getEbtProps({
                element: AGENT_BUILDER_UI_EBT.element.pageContent,
                action: AGENT_BUILDER_UI_EBT.action.conversation.ATTACHMENT_SHARE,
                detail: 'attachment',
              })}
            />
          </EuiToolTip>
        }
        isOpen={isOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="downRight"
      >
        {isDeveloperPanelOpen ? (
          <EuiContextMenuPanel
            title={DEVELOPER_SECTION}
            onClose={() => setIsDeveloperPanelOpen(false)}
            items={DEVELOPER_DESTINATIONS.map(toItem)}
          />
        ) : (
          <>
            <EuiContextMenuPanel
              css={{ paddingBottom: 0 }}
              title={DOWNLOAD_SECTION}
              items={DESTINATIONS.map(toItem)}
            />
            <EuiContextMenuPanel
              css={{ paddingTop: 0, ...(isDev ? { paddingBottom: 0 } : {}) }}
              title={SEND_SECTION}
              items={sendItems}
            />
            {isDev && (
              <>
                <EuiHorizontalRule margin="s" />
                <EuiContextMenuPanel css={{ paddingTop: 0 }} items={developerEntryItems} />
              </>
            )}
          </>
        )}
      </EuiPopover>
      {isSlackModalOpen && slackConnectors?.length ? (
        <SlackShareModal
          {...{ spec, core }}
          connectors={slackConnectors}
          onClose={() => setIsSlackModalOpen(false)}
        />
      ) : null}
    </>
  );
};
