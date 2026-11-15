/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
  type EuiFlyoutMenuCustomAction,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { isEnabledFailureStore } from '@kbn/streams-schema';
import { LifecycleBadge, useDiscoverStreamLink } from '../stream_badges';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useTimeRange } from '../../hooks/use_time_range';
import { IndexInspectPanels } from './index_inspect_panels';
import { IndexQualityBadge } from './index_quality_badge';
import {
  DEFAULT_INDEX_INSPECT_TAB,
  INDEX_INSPECT_TAB_LABELS,
  INDEX_INSPECT_TABS,
  getIndexInspectTargetKind,
  getUnavailableTabTooltip,
  isIndexInspectTabAvailable,
  resolveIndexInspectTab,
  type IndexInspectTabId,
} from './types';
import { useIndexManagementLink } from './use_index_management_link';
import { useIndexMetadata } from './use_index_metadata';

export function IndexInspectFlyout({
  indexName,
  onClose,
  selectedTab: selectedTabProp,
  onSelectTab,
}: {
  indexName: string;
  onClose: () => void;
  selectedTab?: string | null;
  onSelectTab?: (tab: IndexInspectTabId) => void;
}) {
  const { push } = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const headerId = useGeneratedHtmlId();
  const [uncontrolledTab, setUncontrolledTab] =
    useState<IndexInspectTabId>(DEFAULT_INDEX_INSPECT_TAB);
  const selectTab = onSelectTab ?? setUncontrolledTab;
  const requestedTab = onSelectTab ? selectedTabProp : uncontrolledTab;
  const { value: metadata, loading: metadataLoading } = useIndexMetadata(indexName);
  const exists = metadata?.exists ?? false;
  const targetKind = getIndexInspectTargetKind({ metadata, metadataLoading });
  const selectedTab = resolveIndexInspectTab(requestedTab, targetKind);
  const canReadFailureStore = metadata?.privileges.read_failure_store ?? false;
  const discoverLink = useDiscoverStreamLink({ indexName, hasDataStream: exists });
  const stackManagementLink = useIndexManagementLink(indexName, metadata?.is_data_stream ?? false);

  const customActions = useMemo<EuiFlyoutMenuCustomAction[]>(
    () => [
      {
        iconType: 'share',
        'aria-label': i18n.translate('xpack.streams.indexInspect.flyout.goToDetails', {
          defaultMessage: 'Go to index details',
        }),
        onClick: () => {
          push('/new-experience/indices/{indexName}/{tab}', {
            path: { indexName, tab: selectedTab },
            query: { rangeFrom, rangeTo },
          });
        },
      },
    ],
    [indexName, push, rangeFrom, rangeTo, selectedTab]
  );

  return (
    <EuiFlyout
      size="l"
      maxWidth={1600}
      aria-labelledby={headerId}
      onClose={onClose}
      data-test-subj="streamsIndexInspectFlyout"
      paddingSize="none"
      flyoutMenuProps={{
        customActions,
        titleId: headerId,
      }}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          css={css`
            padding: 12px 25px 0;
          `}
        >
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
              <EuiFlexItem grow={false}>
                <EuiTitle size="s" data-test-subj="streamsIndexInspectFlyoutTitle">
                  <h1 id={headerId}>{indexName}</h1>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup responsive wrap gutterSize="xs">
                  {metadataLoading && !metadata && (
                    <EuiFlexItem grow={false}>
                      <EuiLoadingSpinner size="s" />
                    </EuiFlexItem>
                  )}
                  {metadata?.is_data_stream && (
                    <>
                      <EuiFlexItem grow={false}>
                        <IndexQualityBadge
                          indexName={indexName}
                          canReadFailureStore={canReadFailureStore}
                          failureStoreEnabled={isEnabledFailureStore(
                            metadata.effective_failure_store
                          )}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <LifecycleBadge lifecycle={metadata.lifecycle} />
                      </EuiFlexItem>
                    </>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {(stackManagementLink || discoverLink) && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
                {stackManagementLink && (
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      color="text"
                      data-test-subj={`streamsIndexInspectStackManagementButton-${indexName}`}
                      href={stackManagementLink}
                      iconType="managementApp"
                      size="s"
                    >
                      <FormattedMessage
                        id="xpack.streams.indexInspect.flyout.manageInStackManagementButtonLabel"
                        defaultMessage="Manage in Stack Management"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                )}
                {discoverLink && (
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      color="text"
                      data-test-subj={`streamsIndexInspectDiscoverButton-${indexName}`}
                      href={discoverLink}
                      iconType="productDiscover"
                      size="s"
                    >
                      <FormattedMessage
                        id="xpack.streams.indexInspect.flyout.viewInDiscover"
                        defaultMessage="View in Discover"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiTabs
          css={css`
            padding: 0 25px;
            margin-bottom: -1px;
          `}
          data-test-subj="streamsIndexInspectFlyoutTabs"
        >
          {INDEX_INSPECT_TABS.map((tab) => {
            const available = isIndexInspectTabAvailable(tab, targetKind);
            const unavailableTooltip = getUnavailableTabTooltip(targetKind);
            const tabElement = (
              <EuiTab
                isSelected={tab === selectedTab}
                key={tab}
                disabled={!available}
                onClick={() => selectTab(tab)}
                data-test-subj={`streamsIndexInspectFlyoutTab-${tab}`}
              >
                {INDEX_INSPECT_TAB_LABELS[tab]}
              </EuiTab>
            );
            return available || !unavailableTooltip ? (
              tabElement
            ) : (
              <EuiToolTip key={tab} content={unavailableTooltip}>
                {tabElement}
              </EuiToolTip>
            );
          })}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj="streamsIndexInspectFlyoutBody">
        <div
          css={css`
            padding: 25px;
          `}
        >
          <IndexInspectPanels
            indexName={indexName}
            tab={selectedTab}
            metadata={metadata}
            metadataLoading={metadataLoading}
            canReadFailureStore={canReadFailureStore}
          />
        </div>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
