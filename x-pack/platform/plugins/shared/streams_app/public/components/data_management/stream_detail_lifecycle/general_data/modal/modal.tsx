/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
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
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IlmField } from './ilm';
import { DslField, DEFAULT_RETENTION_UNIT, DEFAULT_RETENTION_VALUE } from './dsl';
import { useKibana } from '../../../../../hooks/use_kibana';

export type LifecycleEditAction = 'ilm' | 'custom' | 'forever';

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

  const [isSaveButtonDisabled, setIsSaveButtonDisabled] = useState<boolean>(false);

  const isWired = Streams.WiredStream.GetResponse.is(definition);

  const toggleButtonsCompressed = useMemo(() => {
    const buttons = [
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
      buttons.push({
        id: 'ilm',
        label: i18n.translate('xpack.streams.streamDetailLifecycle.ilmPolicy', {
          defaultMessage: 'ILM policy',
        }),
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
        <EuiModalHeaderTitle id={modalTitleId}>
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
                <h5>
                  {isWired
                    ? i18n.translate(
                        'xpack.streams.streamDetailLifecycle.wiredInheritSwitchLabel',
                        {
                          defaultMessage: 'Inherit from parent stream',
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
                          defaultMessage:
                            "Use the retention configuration from this stream's parent",
                        }
                      )
                    : i18n.translate(
                        'xpack.streams.streamDetailLifecycle.inheritSwitchDescription',
                        {
                          defaultMessage:
                            "Use the retention configuration from this stream's index template",
                        }
                      )
                }
                checked={isInherit}
                onChange={(event) => {
                  if (event.target.checked) {
                    setLifecycle({ inherit: {} });
                    setIsInherit(true);
                    setIsSaveButtonDisabled(false);
                  } else {
                    setIsInherit(false);
                    setIsSaveButtonDisabled(selectedAction === 'ilm' && !isIlmLifecycle(lifecycle));
                  }
                }}
                data-test-subj="inheritDataRetentionSwitch"
              />
            </EuiFlexItem>
          )}

          <EuiFlexItem>
            <EuiText>
              <h5>
                {i18n.translate('xpack.streams.streamDetailLifecycle.dataRetention', {
                  defaultMessage: 'Data retention',
                })}
              </h5>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiButtonGroup
              legend={i18n.translate('xpack.streams.streamDetailLifecycle.dataRetentionOptions', {
                defaultMessage: 'Data retention',
              })}
              onChange={(value) => {
                if (value === 'forever') {
                  setLifecycle({ dsl: {} });
                  setIsSaveButtonDisabled(false);
                }
                if (value === 'custom') {
                  setLifecycle({ dsl: { data_retention: initialCustomPeriodValue } });
                  setIsSaveButtonDisabled(false);
                }
                if (value === 'ilm') {
                  setIsSaveButtonDisabled(!isIlmLifecycle(lifecycle));
                }
                setSelectedAction(value as LifecycleEditAction);
              }}
              options={toggleButtonsCompressed}
              idSelected={selectedAction}
              buttonSize="m"
              isDisabled={isInherit}
              isFullWidth
            />
            <EuiSpacer size="s" />

            {selectedAction === 'ilm' && (
              <IlmField
                getIlmPolicies={getIlmPolicies}
                definition={definition}
                setLifecycle={setLifecycle}
                setSaveButtonDisabled={setIsSaveButtonDisabled}
                readOnly={isInherit}
              />
            )}

            {selectedAction === 'custom' && (
              <DslField
                definition={definition}
                isDisabled={isInherit}
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
