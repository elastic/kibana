/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCopy,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ConditionPanel } from '../../shared';
import { buildRequestPreviewCodeContent } from '../../shared/utils';
import {
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
} from '../state_management/stream_routing_state_machine';
import { buildRoutingForkRequestPayload } from '../utils';
import { type PartitionSuggestion } from './use_review_suggestions_form';

export function CreateStreamConfirmationModal({
  partition,
  onSuccess,
}: {
  partition: PartitionSuggestion;
  onSuccess: () => void;
}) {
  const modalTitleId = useGeneratedHtmlId();
  const streamName = useStreamsRoutingSelector(
    (snapshot) => snapshot.context.definition.stream.name
  );
  const isForking = useStreamsRoutingSelector((snapshot) =>
    snapshot.matches({ ready: { ingestMode: { reviewSuggestedRule: 'forking' } } })
  );
  const { cancelChanges, forkStream } = useStreamRoutingEvents();

  const copyCodeContent = React.useMemo(() => {
    const body = buildRoutingForkRequestPayload({
      where: partition.condition,
      destination: partition.name,
      status: 'enabled',
    });

    return buildRequestPreviewCodeContent({
      method: 'POST',
      url: `/api/streams/${streamName}/_fork`,
      body,
    });
  }, [partition.condition, partition.name, streamName]);

  return (
    <EuiModal
      onClose={() => cancelChanges()}
      aria-labelledby={modalTitleId}
      data-test-subj="streamsAppCreateStreamConfirmationModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle
          id={modalTitleId}
          data-test-subj="streamsAppCreateStreamConfirmationModalTitle"
        >
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
          <EuiFieldText
            value={partition.name}
            readOnly
            data-test-subj="streamsAppCreateStreamConfirmationModalStreamName"
          />
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
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={copyCodeContent}>
              {(copy) => (
                <EuiButtonEmpty
                  data-test-subj="streamsAppDeleteStreamModalCopyCodeButton"
                  size="s"
                  iconType="editorCodeBlock"
                  onClick={copy}
                >
                  {copyCodeButtonText}
                </EuiButtonEmpty>
              )}
            </EuiCopy>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="m">
              <EuiButtonEmpty
                onClick={() => cancelChanges()}
                isDisabled={isForking}
                data-test-subj="streamsAppCreateStreamConfirmationModalCancelButton"
              >
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
                data-test-subj="streamsAppCreateStreamConfirmationModalCreateButton"
              >
                {i18n.translate('xpack.streams.streamDetailRouting.partitionSuggestion.confirm', {
                  defaultMessage: 'Create stream',
                })}
              </EuiButton>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}

const copyCodeButtonText = i18n.translate('xpack.streams.streamDetailRouting.copyCodeButton', {
  defaultMessage: 'Copy API request',
});
