/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Streams,
  isDisabledLifecycle,
  isDslLifecycle,
  isIlmLifecycle,
  isInheritLifecycle,
} from '@kbn/streams-schema';
import React, { ReactNode } from 'react';
import { useBoolean } from '@kbn/react-hooks';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { css } from '@emotion/react';
import { useKibana } from '../../../hooks/use_kibana';
import { LifecycleEditAction } from './modal';
import { IlmLink } from './ilm_link';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { DataStreamStats } from './hooks/use_data_stream_stats';
import { formatIngestionRate } from './helpers/format_bytes';
import { PrivilegesWarningIconWrapper } from '../../insufficient_privileges/insufficient_privileges';

export function RetentionMetadata({
  definition,
  lifecycleActions,
  openEditModal,
  stats,
  isLoadingStats,
  statsError,
}: {
  definition: Streams.ingest.all.GetResponse;
  lifecycleActions: Array<{ name: string; action: LifecycleEditAction }>;
  openEditModal: (action: LifecycleEditAction) => void;
  stats?: DataStreamStats;
  isLoadingStats: boolean;
  statsError?: Error;
}) {
  const { euiTheme } = useEuiTheme();
  const router = useStreamsAppRouter();
  const [isMenuOpen, { toggle: toggleMenu, off: closeMenu }] = useBoolean(false);

  const dateFormatter = useDateFormatter();

  const lifecycle = definition.effective_lifecycle;

  const contextualMenu =
    lifecycleActions.length === 0 ? null : (
      <EuiPopover
        button={
          <EuiToolTip
            content={
              !definition.privileges.lifecycle
                ? i18n.translate(
                    'xpack.streams.entityDetailViewWithoutParams.editDataRetention.insufficientPrivileges',
                    {
                      defaultMessage: "You don't have sufficient privileges to change retention.",
                    }
                  )
                : undefined
            }
          >
            <EuiButtonEmpty
              data-test-subj="streamsAppRetentionMetadataEditDataRetentionButton"
              size="s"
              onClick={toggleMenu}
              disabled={!definition.privileges.lifecycle}
              iconType="pencil"
              css={css`
                margin-bottom: -${euiTheme.size.s};
              `}
            >
              {i18n.translate('xpack.streams.entityDetailViewWithoutParams.editDataRetention', {
                defaultMessage: 'Edit data retention',
              })}
            </EuiButtonEmpty>
          </EuiToolTip>
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
      <IlmLink lifecycle={lifecycle} />
    </EuiBadge>
  ) : null;

  const lifecycleOrigin = isInheritLifecycle(definition.stream.ingest.lifecycle) ? (
    <EuiText size="s">
      {i18n.translate('xpack.streams.streamDetailLifecycle.inheritedFrom', {
        defaultMessage: 'Inherited from',
      })}{' '}
      {Streams.WiredStream.GetResponse.is(definition) ? (
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
    <>
      <MetadataRow
        metadata={i18n.translate('xpack.streams.streamDetailLifecycle.retentionPeriodLabel', {
          defaultMessage: 'Retention period',
        })}
        value={
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
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
            {contextualMenu}
          </EuiFlexGroup>
        }
        dataTestSubj="streamsAppRetentionMetadataRetentionPeriod"
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
        metadata={i18n.translate('xpack.streams.streamDetailLifecycle.lastUupdated', {
          defaultMessage: 'Last updated',
        })}
        value={
          <PrivilegesWarningIconWrapper
            hasPrivileges={definition.privileges.monitor}
            title="lastUpdated"
          >
            {statsError ? (
              '-'
            ) : isLoadingStats || !stats ? (
              <EuiLoadingSpinner size="s" />
            ) : (
              dateFormatter.convert(stats.lastActivity)
            )}
          </PrivilegesWarningIconWrapper>
        }
      />
      <EuiHorizontalRule margin="s" />
      <MetadataRow
        metadata={i18n.translate('xpack.streams.streamDetailLifecycle.ingestionRate', {
          defaultMessage: 'Ingestion',
        })}
        tip={i18n.translate('xpack.streams.streamDetailLifecycle.ingestionRateDetails', {
          defaultMessage:
            'Approximate average (stream total size divided by the number of days since creation).',
        })}
        value={
          <PrivilegesWarningIconWrapper
            hasPrivileges={definition.privileges.monitor}
            title="ingestionRate"
          >
            {statsError ? (
              '-'
            ) : isLoadingStats || !stats ? (
              <EuiLoadingSpinner size="s" />
            ) : stats.bytesPerDay ? (
              formatIngestionRate(stats.bytesPerDay)
            ) : (
              '-'
            )}
          </PrivilegesWarningIconWrapper>
        }
      />
    </>
  );
}

function MetadataRow({
  metadata,
  value,
  tip,
  dataTestSubj,
}: {
  metadata: string;
  value: ReactNode;
  tip?: string;
  dataTestSubj?: string;
}) {
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="xl"
      responsive={false}
      data-test-subj={dataTestSubj}
    >
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
      <EuiFlexItem grow={5}>{value}</EuiFlexItem>
    </EuiFlexGroup>
  );
}

const useDateFormatter = () => {
  const { fieldFormats } = useKibana().dependencies.start;

  return fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.DATE, [ES_FIELD_TYPES.DATE]);
};
