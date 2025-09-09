/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { PolicyFromES } from '@kbn/index-lifecycle-management-common-shared';
import type { IngestStreamLifecycle, IngestStreamLifecycleDSL } from '@kbn/streams-schema';
import { isDslLifecycle, isIlmLifecycle, isInheritLifecycle } from '@kbn/streams-schema';
import { Streams, isRoot } from '@kbn/streams-schema';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalFooter,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  useGeneratedHtmlId,
  EuiSwitch,
  EuiButtonGroup,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IlmField } from './ilm';
import { DslField } from './dsl';
import { useKibana } from '../../../../../hooks/use_kibana';

export type LifecycleEditAction = 'ilm' | 'custom' | 'forever';

interface Props {
  closeModal: () => void;
  updateLifecycle: (lifecycle: IngestStreamLifecycle) => void;
  getIlmPolicies: () => Promise<PolicyFromES[]>;
  definition: Streams.ingest.all.GetResponse;
  updateInProgress: boolean;
}

const DEFAULT_CUSTOM_RETENTION = '90d';

export function EditLifecycleModal({
  closeModal,
  updateLifecycle,
  getIlmPolicies,
  definition,
  updateInProgress,
}: Props) {
  const { isServerless } = useKibana();
  const modalTitleId = useGeneratedHtmlId();

  const [isInherit, setIsInherit] = useState<boolean>(
    isInheritLifecycle(definition.stream.ingest.lifecycle)
  );
  const [selectedAction, setSelectedAction] = useState<LifecycleEditAction>(
    isIlmLifecycle(definition.effective_lifecycle)
      ? 'ilm'
      : isDslLifecycle(definition.effective_lifecycle) &&
        !definition.effective_lifecycle.dsl.data_retention
      ? 'forever'
      : 'custom'
  );
  const [lifecycle, setLifecycle] = useState<IngestStreamLifecycle>(
    definition.effective_lifecycle as IngestStreamLifecycle
  );

  const confirmationIsDisabled = false;

  const isWired = Streams.WiredStream.GetResponse.is(definition);

  const toggleButtonsCompressed = [
    {
      id: 'forever',
      label: i18n.translate('xpack.streams.streamDetailLifecycle.forever', {
        defaultMessage: 'Forever',
      }),
    },
    {
      id: 'custom',
      label: i18n.translate('xpack.streams.streamDetailLifecycle.customPeriod', {
        defaultMessage: 'Custom period',
      }),
    },
  ];

  if (!isServerless) {
    toggleButtonsCompressed.push({
      id: 'ilm',
      label: i18n.translate('xpack.streams.streamDetailLifecycle.ilmPolicy', {
        defaultMessage: 'ILM policy',
      }),
    });
  }

  const initialCustomPeriodValue =
    (definition.effective_lifecycle as IngestStreamLifecycleDSL).dsl?.data_retention ??
    DEFAULT_CUSTOM_RETENTION;

  return (
    <EuiModal onClose={closeModal} aria-labelledby={modalTitleId} css={{ width: '600px' }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.streams.streamDetailLifecycle.editRetention', {
            defaultMessage: 'Edit data retention',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFlexGroup direction="column" gutterSize="s">
          {isWired && !isRoot(definition.stream.name) && (
            <>
              <EuiFlexItem>
                <EuiText>
                  <h5>
                    {i18n.translate('xpack.streams.streamDetailLifecycle.dataRetention', {
                      defaultMessage: 'Inherit from parent stream',
                    })}
                  </h5>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSwitch
                  label={i18n.translate('xpack.streams.streamDetailLifecycle.inherit', {
                    defaultMessage: "Use the retention configuration from this stream's parent",
                  })}
                  checked={isInherit}
                  onChange={() => {
                    setLifecycle({ inherit: {} });
                    setIsInherit(!isInherit);
                  }}
                  data-test-subj="inheritDataRetentionSwitch"
                />
              </EuiFlexItem>
            </>
          )}

          <EuiFlexItem>
            <EuiText>
              <h5>
                {i18n.translate('xpack.streams.streamDetailLifecycle.dataRetention', {
                  defaultMessage: 'Data retention',
                })}
              </h5>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiButtonGroup
              legend={i18n.translate('xpack.streams.streamDetailLifecycle.dataRetentionOptions', {
                defaultMessage: 'Data retention',
              })}
              onChange={(value) => {
                if (value === 'forever') {
                  setLifecycle({ dsl: {} });
                }
                if (value === 'custom') {
                  setLifecycle({ dsl: { data_retention: initialCustomPeriodValue } });
                }
                setSelectedAction(value as LifecycleEditAction);
              }}
              options={toggleButtonsCompressed}
              idSelected={selectedAction}
              buttonSize="m"
              isDisabled={isInherit}
              isFullWidth
            />
          </EuiFlexItem>

          {selectedAction === 'ilm' && !isInherit && (
            <EuiFlexItem>
              <IlmField
                getIlmPolicies={getIlmPolicies}
                definition={definition}
                setLifecycle={setLifecycle}
              />
            </EuiFlexItem>
          )}

          {selectedAction === 'custom' && !isInherit && (
            <EuiFlexItem>
              <DslField
                definition={definition}
                isDisabled={false}
                value={initialCustomPeriodValue}
                setLifecycle={setLifecycle}
              />
            </EuiFlexItem>
          )}

          {!isServerless && selectedAction === 'custom' && (
            <EuiFlexItem>
              <EuiText color="subdued" size="s">
                {i18n.translate('xpack.streams.streamDetailLifecycle.description', {
                  defaultMessage:
                    'This retention period stores data in the hot tier for best indexing and search performance. To use alternative storage tiers, consider an ILM policy.',
                })}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="streamsAppModalFooterCancelButton"
              disabled={updateInProgress}
              color="primary"
              onClick={() => closeModal()}
            >
              {i18n.translate('xpack.streams.streamDetailLifecycle.cancelLifecycleUpdate', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="streamsAppModalFooterButton"
              fill
              disabled={confirmationIsDisabled}
              isLoading={updateInProgress}
              onClick={() => updateLifecycle(lifecycle)}
            >
              {i18n.translate('xpack.streams.streamDetailLifecycle.saveButton', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
