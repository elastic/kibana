/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiFormRow,
  EuiModalFooter,
  EuiSpacer,
  useGeneratedHtmlId,
  EuiTitle,
  EuiFieldText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type PartitionSuggestion } from './use_review_suggestions_form';
import { ConditionPanel } from '../../shared';
import {
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
} from '../state_management/stream_routing_state_machine';

export function CreateStreamConfirmationModal({
  partition,
  onSuccess,
}: {
  partition: PartitionSuggestion;
  onSuccess: () => void;
}) {
  const modalTitleId = useGeneratedHtmlId();
  const isForking = useStreamsRoutingSelector((snapshot) =>
    snapshot.matches({ ready: { reviewSuggestedRule: 'forking' } })
  );
  const { cancelChanges, forkStream } = useStreamRoutingEvents();

  return (
    <EuiModal onClose={() => cancelChanges()} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.streams.streamDetailRouting.partitionSuggestion.confirmTitle', {
            defaultMessage: 'Confirm stream creation',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow
          label={i18n.translate(
            'xpack.streams.streamDetailRouting.partitionSuggestion.streamName',
            {
              defaultMessage: 'Stream name',
            }
          )}
        >
          <EuiFieldText value={partition.name} readOnly />
        </EuiFormRow>
        <EuiSpacer />
        <EuiTitle size="xxxs">
          <h5>
            {i18n.translate('xpack.streams.streamDetailRouting.partitionSuggestion.condition', {
              defaultMessage: 'Condition',
            })}
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <ConditionPanel condition={partition.condition} />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={() => cancelChanges()} isDisabled={isForking}>
          {i18n.translate('xpack.streams.streamDetailRouting.partitionSuggestion.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          isLoading={isForking}
          onClick={() =>
            forkStream({
              destination: partition.name,
              where: partition.condition,
            }).then((result) => {
              if (result.success) {
                onSuccess();
              }
            })
          }
          fill
        >
          {i18n.translate('xpack.streams.streamDetailRouting.partitionSuggestion.confirm', {
            defaultMessage: 'Create stream',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
