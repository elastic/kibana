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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import useToggle from 'react-use/lib/useToggle';
import { type ReviewSuggestionsInputs } from './use_review_suggestions_form';
import { CreateStreamConfirmationModal } from './create_stream_confirmation_modal';

export function SuggestedStreamPanel({
  partition,
  parentName,
  onDismiss,
  onPreview,
}: {
  partition: ReviewSuggestionsInputs['partitions'][number];
  parentName: string;
  onDismiss(): void;
  onPreview(): void;
}) {
  const [isOpen, toggle] = useToggle(false);

  return (
    <>
      {isOpen && (
        <CreateStreamConfirmationModal
          partition={partition}
          parentName={parentName}
          onClose={toggle}
        />
      )}
      <EuiPanel hasShadow={false} hasBorder paddingSize="m">
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h4>{`${parentName}.${partition.name}`}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="inspect" color="text" size="s" onClick={onPreview}>
              {i18n.translate('xpack.streams.streamDetailRouting.partitionSuggestion.preview', {
                defaultMessage: 'Preview',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiPanel color="subdued" hasShadow={false} hasBorder={false} paddingSize="s">
          {JSON.stringify(partition.condition)}
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="inspect" color="text" size="s" onClick={onPreview}>
              {i18n.translate('xpack.streams.streamDetailRouting.partitionSuggestion.preview', {
                defaultMessage: 'Preview',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty size="s" onClick={onDismiss}>
                  {i18n.translate('xpack.streams.streamDetailRouting.partitionSuggestion.dismiss', {
                    defaultMessage: 'Reject',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton iconType="check" size="s" onClick={toggle} fill>
                  {i18n.translate('xpack.streams.streamDetailRouting.partitionSuggestion.accept', {
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
