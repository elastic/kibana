/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import { useAbortController } from '@kbn/react-hooks';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiTitle,
  EuiTabs,
  EuiTab,
  EuiSpacer,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  useGeneratedHtmlId,
  EuiPopover,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { DatasetQualityIndicator } from '@kbn/dataset-quality-plugin/public';
import {
  StreamFlyoutDetailContextProvider,
  useStreamFlyoutDetail,
} from '../../hooks/use_stream_flyout_detail';
import { useKibana } from '../../hooks/use_kibana';
import { ClassicStreamBadge, LifecycleBadge, WiredStreamBadge } from '../stream_badges';
import { useDataSetQuality } from '../../hooks/use_data_set_quality';
import { StreamAttachments } from './stream_attachments';
import { StreamQuality } from './stream_quality';
import { StreamRetention } from './stream_retention';
import { ViewInDiscoverButton } from './discover_button';
import { StreamFlyoutOverview } from './stream_flyout_overview';
import { StreamDeleteModal } from '../stream_delete_modal';
import { StreamProcessing } from './stream_processing';
import {
  useCanvasEvents,
  useCanvasUrlRef,
} from '../stream_management/data_management/stream_detail_canvas/state_management';

const TABS = [
  {
    id: 'overview',
    label: i18n.translate('xpack.streams.flyout.tab.overview', {
      defaultMessage: 'Overview',
    }),
  },
  {
    id: 'quality',
    label: i18n.translate('xpack.streams.flyout.tab.quality', {
      defaultMessage: 'Quality',
    }),
  },
  {
    id: 'retention',
    label: i18n.translate('xpack.streams.flyout.tab.retention', {
      defaultMessage: 'Retention',
    }),
  },
  {
    id: 'processing',
    label: i18n.translate('xpack.streams.flyout.tab.processing', {
      defaultMessage: 'Processing',
    }),
  },
  {
    id: 'attachments',
    label: i18n.translate('xpack.streams.flyout.tab.attachments', {
      defaultMessage: 'Attachments',
    }),
  },
] as const;

export type StreamFlyoutTabId = (typeof TABS)[number]['id'];

const DEFAULT_TAB: StreamFlyoutTabId = 'overview';

const isStreamFlyoutTabId = (tab: string | null): tab is StreamFlyoutTabId => {
  return TABS.some(({ id }) => id === tab);
};

interface StreamFlyoutPageProps extends StreamFlyoutProps {
  loading: boolean;
}

function StandardStreamFlyoutPage({
  loading,
  children,
  fillHeight = false,
}: React.PropsWithChildren<{ loading: boolean; fillHeight?: boolean }>) {
  return (
    <EuiFlyoutBody
      data-test-subj="streamsCanvasFlyoutBody"
      css={
        fillHeight
          ? css`
              .euiFlyoutBody__overflowContent {
                box-sizing: border-box;
                height: 100%;
              }

              .euiFlyoutBody__overflowContent > div {
                height: 100%;
              }
            `
          : undefined
      }
    >
      <div
        css={css`
          padding: 25px;
          ${fillHeight ? 'box-sizing: border-box; height: 100%;' : ''}
        `}
      >
        {loading ? (
          <EuiFlexGroup justifyContent="center" alignItems="center" css={{ height: '100%' }}>
            <EuiLoadingSpinner data-test-subj="streamsCanvasFlyout-loading" size="xxl" />
          </EuiFlexGroup>
        ) : (
          children
        )}
      </div>
    </EuiFlyoutBody>
  );
}

const TAB_PAGES: Record<StreamFlyoutTabId, (props: StreamFlyoutPageProps) => React.JSX.Element> = {
  overview: (props) => (
    <StandardStreamFlyoutPage loading={props.loading}>
      <StreamFlyoutOverview {...props} />
    </StandardStreamFlyoutPage>
  ),
  quality: (props) => (
    <StandardStreamFlyoutPage loading={props.loading}>
      <StreamQuality {...props} />
    </StandardStreamFlyoutPage>
  ),
  processing: (props) => <StreamProcessing {...props} />,
  attachments: (props) => (
    <StandardStreamFlyoutPage loading={props.loading} fillHeight>
      <StreamAttachments {...props} />
    </StandardStreamFlyoutPage>
  ),
  retention: (props) => (
    <StandardStreamFlyoutPage loading={props.loading}>
      <StreamRetention {...props} />
    </StandardStreamFlyoutPage>
  ),
};

function StreamFlyoutContent({ name, onClose, refreshStreams }: StreamFlyoutProps) {
  const { loading, definition } = useStreamFlyoutDetail();
  const { flyoutTab } = useCanvasUrlRef();
  const { selectTab } = useCanvasEvents();
  const { quality, isQualityLoading } = useDataSetQuality(name, definition);
  const selectedTab = isStreamFlyoutTabId(flyoutTab) ? flyoutTab : DEFAULT_TAB;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isHeaderMenuOpen, setHeaderMenuOpen] = useState(false);
  const headerId = useGeneratedHtmlId();
  const headerMenuId = useGeneratedHtmlId({ prefix: 'canvasFlyoutHeaderMenu' });
  const abortController = useAbortController();
  const {
    core: {
      application: { navigateToApp },
    },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const hasProcessingEnabled = useMemo(
    () =>
      definition &&
      Streams.ingest.all.GetResponse.is(definition) &&
      'processors' in definition.stream.ingest.processing &&
      definition.stream.ingest.processing.processors.length > 0,
    [definition]
  );

  const [showProcessing, setShowProcessing] = useState(hasProcessingEnabled);

  // showProcessing is nullish to start, but then we can either toggle it on or off
  // once data has been loaded.
  const isProcessingEnabled = showProcessing ?? hasProcessingEnabled;

  const canDeleteStream =
    definition &&
    Streams.ClassicStream.GetResponse.is(definition) &&
    definition.privileges.manage &&
    !definition.replicated;

  const deleteStream = useCallback(async () => {
    if (!Streams.ingest.all.GetResponse.is(definition)) {
      return;
    }
    await streamsRepositoryClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
      params: { path: { name: definition.stream.name } },
      signal: abortController.signal,
    });
    navigateToApp('/streams');
  }, [definition, abortController.signal, navigateToApp, streamsRepositoryClient]);

  const renderTabs = useMemo(
    () =>
      TABS.filter(({ id }) => id !== 'processing' || isProcessingEnabled).map(({ id, label }) => (
        <EuiTab
          isSelected={id === selectedTab}
          key={id}
          onClick={() => selectTab(id)}
          data-test-subj={`streamsCanvasFlyoutTab-${id}`}
        >
          {label}
        </EuiTab>
      )),
    [selectTab, selectedTab, isProcessingEnabled]
  );

  const page = useMemo(
    () => TAB_PAGES[selectedTab]({ name, onClose, loading, refreshStreams }),
    [loading, name, onClose, refreshStreams, selectedTab]
  );
  const badges = [];

  if (loading) {
    badges.push(
      <EuiFlexItem grow={false} key="loading-indicator">
        <EuiLoadingSpinner size="s" />
      </EuiFlexItem>
    );
  }

  if (definition) {
    badges.push(
      <EuiFlexItem grow={false} key="dataset-indicator">
        <DatasetQualityIndicator
          quality={quality}
          isLoading={isQualityLoading}
          verbose={true}
          showTooltip={true}
        />
      </EuiFlexItem>
    );
  }

  let discoverButton = null;

  if (definition && Streams.WiredStream.GetResponse.is(definition)) {
    badges.push(
      <EuiFlexItem grow={false} key="wired-badge">
        <WiredStreamBadge />
      </EuiFlexItem>
    );
  }

  if (definition && Streams.ClassicStream.GetResponse.is(definition)) {
    badges.push(
      <EuiFlexItem grow={false} key="lifecycle-badge">
        <LifecycleBadge lifecycle={definition.effective_lifecycle} />
      </EuiFlexItem>,
      <EuiFlexItem grow={false} key="classic-badge">
        <ClassicStreamBadge />
      </EuiFlexItem>
    );

    discoverButton = (
      <EuiFlexItem grow={false}>
        <ViewInDiscoverButton
          stream={definition.stream}
          indexMode={definition.index_mode ?? 'standard'}
          hasDataStream={definition.data_stream_exists}
        />
      </EuiFlexItem>
    );
  }

  const customActions = [];

  if (definition) {
    customActions.push(
      <EuiContextMenuItem
        data-test-subj="canvasFlyoutStreamMenu-processingToggle"
        key="processing-toggle"
        disabled={hasProcessingEnabled}
        icon={isProcessingEnabled ? 'minus' : 'plus'}
        onClick={() => {
          const showing = !isProcessingEnabled;
          setShowProcessing(showing);
          if (showing) {
            selectTab('processing');
          } else {
            selectTab('overview');
          }
        }}
      >
        {i18n.translate('xpack.streams.flyout.tab.toggleProcessing', {
          defaultMessage: `{processing, select,
            true {Remove processing}
            other {Add processing}
          }`,
          values: {
            processing: isProcessingEnabled,
          },
        })}
      </EuiContextMenuItem>
    );
  }

  if (canDeleteStream) {
    customActions.push(
      <EuiContextMenuItem
        data-test-subj="canvasFlyoutStreamMenu-deleteStream"
        key="delete-stream"
        icon="trash"
        color="danger"
        onClick={() => {
          setShowDeleteModal(true);
        }}
      >
        {i18n.translate('xpack.streams.flyout.tab.deleteStreamLink', {
          defaultMessage: 'Delete Stream',
        })}
      </EuiContextMenuItem>
    );
  }

  const menuLabel = i18n.translate('xpack.streams.flyout.tab.headerMenuLabel', {
    defaultMessage: 'Stream Menu',
  });

  const headerMenu = customActions.length ? (
    <EuiFlexItem grow={false}>
      <EuiPopover
        aria-labelledby={headerId}
        id={headerMenuId}
        button={
          <EuiToolTip position="left" content={menuLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="canvasFlyoutStreamMenu-button"
              aria-label={menuLabel}
              size="s"
              iconType="ellipsis"
              iconSize="m"
              onClick={() => {
                setHeaderMenuOpen(!isHeaderMenuOpen);
              }}
            />
          </EuiToolTip>
        }
        isOpen={isHeaderMenuOpen}
        closePopover={() => setHeaderMenuOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downRight"
      >
        <EuiContextMenuPanel items={customActions} />
      </EuiPopover>
    </EuiFlexItem>
  ) : null;

  return (
    <EuiFlyout
      size="l"
      maxWidth={1600}
      aria-labelledby={headerId}
      onClose={onClose}
      data-test-subj="streamsCanvasFlyout"
      paddingSize="none"
      closeButtonPosition="inside"
      flyoutMenuDisplayMode="always"
      flyoutMenuProps={{}}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          css={css`
            padding: 12px 25px 0;
          `}
        >
          <EuiFlexItem>
            <EuiFlexGroup
              alignItems="center"
              css={css`
                min-height: 32px;
              `}
              gutterSize="s"
              wrap
            >
              <EuiFlexItem grow={false}>
                <EuiTitle size="s" data-test-subj="streamsCanvasFlyoutTitle">
                  <h1 id={headerId}>{name}</h1>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup responsive wrap gutterSize="xs">
                  {badges}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs">
              {headerMenu}
              {discoverButton}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiTabs
          css={css`
            padding: 0 25px;
            margin-bottom: -1px;
          `}
          data-test-subj="streamsCanvasFlyoutTabs"
        >
          {renderTabs}
        </EuiTabs>
      </EuiFlyoutHeader>
      {page}
      {showDeleteModal && Streams.ingest.all.GetResponse.is(definition) && (
        <StreamDeleteModal
          name={definition.stream.name}
          onClose={() => setShowDeleteModal(false)}
          onCancel={() => setShowDeleteModal(false)}
          onDelete={deleteStream}
        />
      )}
    </EuiFlyout>
  );
}

export interface StreamFlyoutProps {
  name: string;
  onClose: () => void;
  refreshStreams?: () => void;
}

export function StreamFlyout({ name, onClose, refreshStreams }: StreamFlyoutProps) {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;

  return (
    <StreamFlyoutDetailContextProvider
      name={name}
      streamsRepositoryClient={streamsRepositoryClient}
    >
      <StreamFlyoutContent name={name} onClose={onClose} refreshStreams={refreshStreams} />
    </StreamFlyoutDetailContextProvider>
  );
}
