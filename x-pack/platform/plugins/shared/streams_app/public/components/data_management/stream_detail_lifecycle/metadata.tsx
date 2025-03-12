/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IlmLocatorParams } from '@kbn/index-lifecycle-management-common-shared';
import { LocatorPublic } from '@kbn/share-plugin/common';
import {
  IngestStreamGetResponse,
  isDisabledLifecycle,
  isDslLifecycle,
  isIlmLifecycle,
  isInheritLifecycle,
  isWiredStreamGetResponse,
} from '@kbn/streams-schema';
import React, { ReactNode } from 'react';
import { useBoolean } from '@kbn/react-hooks';
import {
  EuiBadge,
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LifecycleEditAction } from './modal';
import { IlmLink } from './ilm_link';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { DataStreamStats } from './hooks/use_data_stream_stats';
import { formatIngestionRate } from './helpers/format_bytes';

export function RetentionMetadata({
  definition,
  ilmLocator,
  lifecycleActions,
  openEditModal,
  stats,
  isLoadingStats,
  statsError,
}: {
  definition: IngestStreamGetResponse;
  ilmLocator?: LocatorPublic<IlmLocatorParams>;
  lifecycleActions: Array<{ name: string; action: LifecycleEditAction }>;
  openEditModal: (action: LifecycleEditAction) => void;
  stats?: DataStreamStats;
  isLoadingStats: boolean;
  statsError?: Error;
}) {
  const [isMenuOpen, { toggle: toggleMenu, off: closeMenu }] = useBoolean(false);
  const router = useStreamsAppRouter();
  const lifecycle = definition.effective_lifecycle;

  const contextualMenu =
    lifecycleActions.length === 0 ? null : (
      <EuiPopover
        button={
          <EuiButton
            data-test-subj="streamsAppRetentionMetadataEditDataRetentionButton"
            size="s"
            fullWidth
            onClick={toggleMenu}
          >
            {i18n.translate('xpack.streams.entityDetailViewWithoutParams.editDataRetention', {
              defaultMessage: 'Edit data retention',
            })}
          </EuiButton>
        }
        isOpen={isMenuOpen}
        closePopover={closeMenu}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel
          items={lifecycleActions.map(({ name, action }) => (
            <EuiContextMenuItem
              key={action}
              onClick={() => {
                closeMenu();
                openEditModal(action);
              }}
            >
              {name}
            </EuiContextMenuItem>
          ))}
        />
      </EuiPopover>
    );

  const ilmLink = isIlmLifecycle(lifecycle) ? (
    <EuiBadge color="hollow">
      <IlmLink lifecycle={lifecycle} ilmLocator={ilmLocator} />
    </EuiBadge>
  ) : null;

  const lifecycleOrigin = isInheritLifecycle(definition.stream.ingest.lifecycle) ? (
    <EuiText size="s">
      {i18n.translate('xpack.streams.streamDetailLifecycle.inheritedFrom', {
        defaultMessage: 'Inherited from',
      })}{' '}
      {isWiredStreamGetResponse(definition) ? (
        <EuiLink
          data-test-subj="streamsAppRetentionMetadataLink"
          target="_blank"
          href={router.link('/{key}/{tab}', {
            path: {
              key: definition.effective_lifecycle.from,
              tab: 'overview',
            },
          })}
        >
          [{definition.effective_lifecycle.from}]
        </EuiLink>
      ) : (
        i18n.translate('xpack.streams.streamDetailLifecycle.localOverride', {
          defaultMessage: 'the underlying data stream',
        })
      )}
    </EuiText>
  ) : (
    <EuiText size="s">
      {i18n.translate('xpack.streams.streamDetailLifecycle.localOverride', {
        defaultMessage: 'Local override',
      })}
    </EuiText>
  );

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s">
      <MetadataRow
        metadata={i18n.translate('xpack.streams.streamDetailLifecycle.retentionPeriodLabel', {
          defaultMessage: 'Retention period',
        })}
        value={
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color={isDisabledLifecycle(lifecycle) ? 'default' : 'accent'}>
                {isDslLifecycle(lifecycle)
                  ? lifecycle.dsl.data_retention ?? '∞'
                  : isIlmLifecycle(lifecycle)
                  ? i18n.translate('xpack.streams.streamDetailLifecycle.policyBased', {
                      defaultMessage: 'Policy-based',
                    })
                  : i18n.translate('xpack.streams.streamDetailLifecycle.policyDisabled', {
                      defaultMessage: 'Disabled',
                    })}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        button={contextualMenu}
      />
      <EuiHorizontalRule margin="s" />
      <MetadataRow
        metadata={i18n.translate('xpack.streams.streamDetailLifecycle.retentionSourceLabel', {
          defaultMessage: 'Source',
        })}
        value={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {ilmLink ? <EuiFlexItem grow={false}>{ilmLink}</EuiFlexItem> : null}
            <EuiFlexItem grow={false}>{lifecycleOrigin}</EuiFlexItem>
          </EuiFlexGroup>
        }
      />
      <EuiHorizontalRule margin="s" />
      <MetadataRow
        metadata={i18n.translate('xpack.streams.streamDetailLifecycle.ingestionRate', {
          defaultMessage: 'Ingestion',
        })}
        tip={i18n.translate('xpack.streams.streamDetailLifecycle.ingestionRateDetails', {
          defaultMessage:
            'Estimated average (stream total size divided by the number of days since creation).',
        })}
        value={
          statsError ? (
            '-'
          ) : isLoadingStats || !stats ? (
            <EuiLoadingSpinner size="s" />
          ) : stats.bytesPerDay ? (
            formatIngestionRate(stats.bytesPerDay)
          ) : (
            '-'
          )
        }
      />
      <EuiHorizontalRule margin="s" />
      <MetadataRow
        metadata={i18n.translate('xpack.streams.streamDetailLifecycle.totalDocs', {
          defaultMessage: 'Total doc count',
        })}
        value={
          statsError ? (
            '-'
          ) : isLoadingStats || !stats ? (
            <EuiLoadingSpinner size="s" />
          ) : (
            stats.totalDocs
          )
        }
      />
    </EuiPanel>
  );
}

function MetadataRow({
  metadata,
  value,
  tip,
  button,
}: {
  metadata: string;
  value: ReactNode;
  tip?: string;
  button?: ReactNode;
}) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="xl" responsive={false}>
      <EuiFlexItem grow={1}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <b>{metadata}</b>
          </EuiFlexItem>

          {tip ? (
            <EuiFlexItem grow={false}>
              <EuiIconTip content={tip} position="right" />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={4}>{value}</EuiFlexItem>
      <EuiFlexItem grow={1}>{button}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
