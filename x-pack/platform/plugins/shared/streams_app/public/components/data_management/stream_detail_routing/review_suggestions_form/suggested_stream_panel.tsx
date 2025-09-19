/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButton,
  EuiPanel,
  EuiButtonEmpty,
  EuiSpacer,
  EuiText,
  EuiIcon,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import useToggle from 'react-use/lib/useToggle';
import type { Streams } from '@kbn/streams-schema';
import { type ReviewSuggestionsInputs } from './use_review_suggestions_form';
import { CreateStreamConfirmationModal } from './create_stream_confirmation_modal';
import { getPercentageFormatter } from '../../../../util/formatters';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { useMatchRate } from './use_match_rate';
import { ConditionPanel } from './condition_panel';

const percentageFormatter = getPercentageFormatter({ precision: 2 });

export function SuggestedStreamPanel({
  definition,
  partition,
  onDismiss,
  onPreview,
  onSuccess,
}: {
  definition: Streams.WiredStream.GetResponse;
  partition: ReviewSuggestionsInputs['suggestions'][number];
  onDismiss(): void;
  onPreview(): void;
  onSuccess(): void;
}) {
  const [isModalOpen, toggleModal] = useToggle(false);
  const { timeState } = useTimefilter();
  const matchRate = useMatchRate(definition, partition, timeState.start, timeState.end);

  return (
    <>
      {isModalOpen && (
        <CreateStreamConfirmationModal
          definition={definition}
          partition={partition}
          onSuccess={() => {
            toggleModal(false);
            onSuccess();
          }}
          onClose={() => toggleModal(false)}
        />
      )}
      <EuiPanel hasShadow={false} hasBorder paddingSize="m">
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h4>{`${definition.stream.name}.${partition.name}`}</h4>
            </EuiTitle>
          </EuiFlexItem>
          {matchRate.loading ? (
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="s" />
            </EuiFlexItem>
          ) : matchRate.value !== undefined ? (
            <>
              <EuiFlexItem grow={false}>
                <EuiIcon type="check" color="success" size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="success">
                  {percentageFormatter.format(matchRate.value)}
                </EuiText>
              </EuiFlexItem>
            </>
          ) : null}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <ConditionPanel condition={partition.condition} />
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="inspect" isSelected={false} size="s" onClick={onPreview}>
              {i18n.translate('xpack.streams.streamDetailRouting.suggestedStreamPanel.preview', {
                defaultMessage: 'Preview',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty size="s" onClick={onDismiss}>
                  {i18n.translate(
                    'xpack.streams.streamDetailRouting.suggestedStreamPanel.dismiss',
                    {
                      defaultMessage: 'Reject',
                    }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton iconType="check" size="s" onClick={() => toggleModal(true)} fill>
                  {i18n.translate('xpack.streams.streamDetailRouting.suggestedStreamPanel.accept', {
                    defaultMessage: 'Accept',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
}
