/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { Signal } from '../../../../common/http_api/signals';
import {
  humanizeQueryKind,
  signalSummary,
  signalTitle,
  SIGNAL_STATUS_ERROR,
} from './signal_format';

interface SignalRowProps {
  signal: Signal;
  onViewDetails: () => void;
}

/**
 * Compact, read-only card for a single signal: humanized tag + target, a 2-line-clamped summary,
 * evidence chips derived from real `data` fields, a status badge, and a "View details" action.
 */
export const SignalRow = ({ signal, onViewDetails }: SignalRowProps) => {
  const { data } = signal;
  const isError = data.status === SIGNAL_STATUS_ERROR;

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="contextSignalRow">
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4 data-test-subj="contextSignalRowTitle">{signalTitle(signal)}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={isError ? 'danger' : 'success'} data-test-subj="contextSignalRowStatus">
            {isError
              ? i18n.translate('xpack.contextEngine.aiIndexDetail.signals.status.error', {
                  defaultMessage: 'Error',
                })
              : i18n.translate('xpack.contextEngine.aiIndexDetail.signals.status.ok', {
                  defaultMessage: 'Ok',
                })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xs" />

      <EuiText
        size="s"
        color="subdued"
        data-test-subj="contextSignalRowSummary"
        css={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        <p>{signalSummary(signal)}</p>
      </EuiText>

      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="xs" responsive={false} wrap alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" data-test-subj="contextSignalRowQueryKind">
            {humanizeQueryKind(data.query_kind)}
          </EuiBadge>
        </EuiFlexItem>
        {data.fell_back_to_raw && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning" data-test-subj="contextSignalRowFellBackToRaw">
              {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.chip.fellBackToRaw', {
                defaultMessage: 'Fell back to raw',
              })}
            </EuiBadge>
          </EuiFlexItem>
        )}
        {data.looped && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="contextSignalRowLooped">
              {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.chip.looped', {
                defaultMessage: 'Looped',
              })}
            </EuiBadge>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" data-test-subj="contextSignalRowRounds">
            {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.chip.roundSignals', {
              defaultMessage: '{esql} ES|QL · {raw} raw · {ki} KI',
              values: {
                esql: data.round_signals.esql_count,
                raw: data.round_signals.raw_query_count,
                ki: data.round_signals.ki_retrieval_count,
              },
            })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="inspect"
            onClick={onViewDetails}
            data-test-subj="contextSignalRowViewDetailsButton"
          >
            {i18n.translate('xpack.contextEngine.aiIndexDetail.signals.viewDetailsButton', {
              defaultMessage: 'View details',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
