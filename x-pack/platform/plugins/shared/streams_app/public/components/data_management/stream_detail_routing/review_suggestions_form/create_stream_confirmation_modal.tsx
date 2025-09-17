/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiText,
  EuiPanel,
  EuiModalFooter,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { useStreamsRoutingActorRef } from '../state_management/stream_routing_state_machine';
import { type ReviewSuggestionsInputs } from './use_review_suggestions_form';
import { useForkStream } from './use_fork_stream';

export function CreateStreamConfirmationModal({
  partition,
  parentName,
  onClose,
}: {
  partition: ReviewSuggestionsInputs['partitions'][number];
  parentName: string;
  onClose: () => void;
}) {
  const streamsRoutingActorRef = useStreamsRoutingActorRef();
  const [forkStreamState, forkStream] = useForkStream();
  const modalTitleId = useGeneratedHtmlId();

  const name = `${parentName}.${partition.name}`;

  // Append created stream to the list of child streams
  useEffect(() => {
    if (forkStreamState.value) {
      streamsRoutingActorRef.send({
        type: 'suggestion.append',
        definitions: [
          {
            destination: name,
            where: partition.condition,
            status: 'enabled',
          },
        ],
      });
    }
  }, [forkStreamState.value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <EuiModal onClose={onClose} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.streams.streamDetailRouting.partitionSuggestion.confirmTitle', {
            defaultMessage: 'Confirm stream creation',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText>
          {i18n.translate('xpack.streams.streamDetailRouting.partitionSuggestion.confirmMessage', {
            defaultMessage: 'Are you sure you want to create this stream?',
          })}
        </EuiText>
        <EuiPanel color="subdued" hasShadow={false} hasBorder={false} paddingSize="s">
          {JSON.stringify(partition.condition)}
        </EuiPanel>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} isDisabled={forkStreamState.loading}>
          {i18n.translate('xpack.streams.streamDetailRouting.partitionSuggestion.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          isLoading={forkStreamState.loading}
          onClick={() =>
            forkStream({
              parentName,
              name,
              condition: partition.condition,
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
