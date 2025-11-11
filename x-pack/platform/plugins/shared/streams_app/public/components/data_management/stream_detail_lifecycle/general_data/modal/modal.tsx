/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import type { PolicyFromES } from '@kbn/index-lifecycle-management-common-shared';
import type {
  IngestStreamLifecycle,
  IngestStreamLifecycleAll,
  IngestStreamLifecycleDSL,
} from '@kbn/streams-schema';
import {
  effectiveToIngestLifecycle,
  isDisabledLifecycle,
  isDslLifecycle,
  isErrorLifecycle,
  isIlmLifecycle,
  isInheritLifecycle,
} from '@kbn/streams-schema';
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
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IlmField } from './ilm';
import { DslField, DEFAULT_RETENTION_UNIT, DEFAULT_RETENTION_VALUE } from './dsl';
import { useKibana } from '../../../../../hooks/use_kibana';

export type LifecycleEditAction = 'ilm' | 'custom' | 'indefinite';

interface Props {
  closeModal: () => void;
  updateLifecycle: (lifecycle: IngestStreamLifecycle) => void;
  getIlmPolicies: () => Promise<PolicyFromES[]>;
  definition: Streams.ingest.all.GetResponse;
  updateInProgress: boolean;
}

export function EditLifecycleModal({
  closeModal,
  updateLifecycle,
  getIlmPolicies,
  definition,
  updateInProgress,
}: Props) {
  const { isServerless } = useKibana();
  const modalTitleId = useGeneratedHtmlId();
  const isCurrentLifecycleInherit = isInheritLifecycle(definition.stream.ingest.lifecycle);
  const initialSelectedAction: LifecycleEditAction = isIlmLifecycle(definition.effective_lifecycle)
    ? 'ilm'
    : isDslLifecycle(definition.effective_lifecycle) &&
      !definition.effective_lifecycle.dsl.data_retention
    ? 'indefinite'
    : 'custom';

  const [isInheritToggleOn, setIsInheritToggleOn] = useState<boolean>(isCurrentLifecycleInherit);
  const [selectedAction, setSelectedAction] = useState<LifecycleEditAction>(initialSelectedAction);
  const [lifecycle, setLifecycle] = useState<IngestStreamLifecycleAll>(
    effectiveToIngestLifecycle(definition.effective_lifecycle)
  );

  const [isSaveButtonDisabled, setIsSaveButtonDisabled] = useState<boolean>(
    selectedAction === 'ilm'
  );

  const isWired = Streams.WiredStream.GetResponse.is(definition);

  const toggleButtonsCompressed = useMemo(() => {
    const buttons = [
      {
        id: 'indefinite',
        label: i18n.translate('xpack.streams.streamDetailLifecycle.indefinite', {
          defaultMessage: 'Indefinite',
        }),
        'data-test-subj': 'indefiniteRetentionButton',
      },
      {
        id: 'custom',
        label: i18n.translate('xpack.streams.streamDetailLifecycle.customPeriod', {
          defaultMessage: 'Custom period',
        }),
        'data-test-subj': 'customRetentionButton',
      },
    ];

    if (!isServerless) {
      buttons.push({
        id: 'ilm',
        label: i18n.translate('xpack.streams.streamDetailLifecycle.ilmPolicy', {
          defaultMessage: 'ILM policy',
        }),
        'data-test-subj': 'ilmRetentionButton',
      });
    }

    return buttons;
  }, [isServerless]);

  const initialCustomPeriodValue =
    (definition.effective_lifecycle as IngestStreamLifecycleDSL).dsl?.data_retention ??
    `${DEFAULT_RETENTION_VALUE}${DEFAULT_RETENTION_UNIT.value}`;

  return (
    <EuiModal onClose={closeModal} aria-labelledby={modalTitleId} css={{ width: '600px' }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId} data-test-subj="editLifecycleModalTitle">
          {i18n.translate('xpack.streams.streamDetailLifecycle.editRetention', {
            defaultMessage: 'Edit data retention',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFlexGroup direction="column" gutterSize="l">
          {(!isWired || !isRoot(definition.stream.name)) && (
            <EuiFlexItem>
              <EuiText>
                <h5 data-test-subj="inheritRetentionHeading">
                  {isWired
                    ? i18n.translate(
                        'xpack.streams.streamDetailLifecycle.wiredInheritSwitchLabel',
                        {
                          defaultMessage: 'Inherit retention',
                        }
                      )
                    : i18n.translate(
                        'xpack.streams.streamDetailLifecycle.classicInheritSwitchLabel',
                        {
                          defaultMessage: 'Inherit from index template',
                        }
                      )}
                </h5>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiSwitch
                label={
                  isWired
                    ? i18n.translate(
                        'xpack.streams.streamDetailLifecycle.inheritSwitchDescription',
                        {
                          defaultMessage: 'Use the parent stream’s retention configuration',
                        }
                      )
                    : i18n.translate(
                        'xpack.streams.streamDetailLifecycle.inheritSwitchDescription',
                        {
                          defaultMessage: 'Use the stream’s index template retention configuration',
                        }
                      )
                }
                checked={isInheritToggleOn}
                onChange={(event) => {
                  if (event.target.checked) {
                    if (isCurrentLifecycleInherit) {
                      setLifecycle(effectiveToIngestLifecycle(definition.effective_lifecycle));
                      setSelectedAction(initialSelectedAction);
                    }
                    setIsInheritToggleOn(true);
                    setIsSaveButtonDisabled(false);
                  } else {
                    setIsInheritToggleOn(false);
                    setIsSaveButtonDisabled(selectedAction === 'ilm');
                  }
                }}
                data-test-subj="inheritDataRetentionSwitch"
              />
            </EuiFlexItem>
          )}

          <EuiFlexItem>
            <EuiText>
              <h5 data-test-subj="customRetentionHeading">
                {i18n.translate('xpack.streams.streamDetailLifecycle.dataRetention', {
                  defaultMessage: 'Custom retention',
                })}
              </h5>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiButtonGroup
              legend={i18n.translate('xpack.streams.streamDetailLifecycle.dataRetentionOptions', {
                defaultMessage: 'Data retention',
              })}
              onChange={(value) => {
                if (value === 'indefinite') {
                  setLifecycle({ dsl: {} });
                  setIsSaveButtonDisabled(false);
                }
                if (value === 'custom') {
                  setLifecycle({ dsl: { data_retention: initialCustomPeriodValue } });
                  setIsSaveButtonDisabled(false);
                }
                if (value === 'ilm') {
                  setIsSaveButtonDisabled(true);
                }
                setSelectedAction(value as LifecycleEditAction);
              }}
              options={toggleButtonsCompressed}
              idSelected={selectedAction}
              buttonSize="m"
              isDisabled={isInheritToggleOn}
              isFullWidth
              data-test-subj="dataRetentionButtonGroup"
            />
            <EuiSpacer size="s" />

            {selectedAction === 'ilm' && (!isInheritToggleOn || isCurrentLifecycleInherit) && (
              <IlmField
                getIlmPolicies={getIlmPolicies}
                initialValue={lifecycle}
                setLifecycle={setLifecycle}
                setSaveButtonDisabled={setIsSaveButtonDisabled}
                readOnly={isInheritToggleOn}
              />
            )}

            {selectedAction === 'custom' && (!isInheritToggleOn || isCurrentLifecycleInherit) && (
              <DslField
                initialValue={lifecycle}
                isDisabled={isInheritToggleOn}
                setLifecycle={setLifecycle}
                setSaveButtonDisabled={setIsSaveButtonDisabled}
              />
            )}

            {!isServerless && selectedAction === 'custom' && (
              <EuiText color="subdued" size="s">
                {i18n.translate('xpack.streams.streamDetailLifecycle.description', {
                  defaultMessage:
                    'This retention period stores data in the hot tier for best indexing and search performance. To use alternative storage tiers, consider an ILM policy.',
                })}
              </EuiText>
            )}
          </EuiFlexItem>
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
              disabled={isSaveButtonDisabled}
              isLoading={updateInProgress}
              onClick={() => {
                if (isInheritToggleOn) {
                  updateLifecycle({ inherit: {} });
                  return;
                }

                if (isDisabledLifecycle(lifecycle) || isErrorLifecycle(lifecycle)) {
                  return;
                }

                updateLifecycle(lifecycle);
              }}
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
