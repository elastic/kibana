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
  EuiFormRow,
  EuiModalFooter,
  EuiSpacer,
  useGeneratedHtmlId,
  EuiTitle,
  EuiFieldText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import { type ReviewSuggestionsInputs } from './use_review_suggestions_form';
import { useForkStream } from './use_fork_stream';
import { ConditionPanel } from './condition_panel';

export function CreateStreamConfirmationModal({
  definition,
  partition,
  onClose,
  onSuccess,
}: {
  definition: Streams.WiredStream.GetResponse;
  partition: ReviewSuggestionsInputs['suggestions'][number];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [forkStreamState, forkStream] = useForkStream(onSuccess);
  const modalTitleId = useGeneratedHtmlId();

  const name = `${definition.stream.name}.${partition.name}`;

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
        <EuiFormRow
          label={i18n.translate(
            'xpack.streams.streamDetailRouting.partitionSuggestion.streamName',
            {
              defaultMessage: 'Stream name',
            }
          )}
        >
          <EuiFieldText value={name} readOnly />
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
        <EuiButtonEmpty onClick={onClose} isDisabled={forkStreamState.loading}>
          {i18n.translate('xpack.streams.streamDetailRouting.partitionSuggestion.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          isLoading={forkStreamState.loading}
          onClick={() =>
            forkStream({
              parentName: definition.stream.name,
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
