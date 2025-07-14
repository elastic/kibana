/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ILM_LOCATOR_ID,
  IlmLocatorParams,
  Phases,
  PolicyFromES,
} from '@kbn/index-lifecycle-management-common-shared';
import {
  IngestStreamLifecycle,
  getAncestors,
  isIlmLifecycle,
  findInheritedLifecycle,
  findInheritingStreams,
  isDslLifecycle,
  Streams,
} from '@kbn/streams-schema';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiLink,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiSelectableOption,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import useToggle from 'react-use/lib/useToggle';
import { useKibana } from '../../../hooks/use_kibana';
import { rolloverCondition } from './helpers/rollover_condition';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useWiredStreams } from '../../../hooks/use_wired_streams';
import { getFormattedError } from '../../../util/errors';
import { parseDuration } from './helpers';

export type LifecycleEditAction = 'none' | 'dsl' | 'ilm' | 'inherit';

interface ModalOptions {
  closeModal: () => void;
  updateLifecycle: (lifecycle: IngestStreamLifecycle) => void;
  getIlmPolicies: () => Promise<PolicyFromES[]>;
  definition: Streams.ingest.all.GetResponse;
  updateInProgress: boolean;
}

export function EditLifecycleModal({
  action,
  ...options
}: { action: LifecycleEditAction } & ModalOptions) {
  if (action === 'none') {
    return null;
  }

  if (action === 'dsl') {
    return <DslModal {...options} />;
  }

  if (action === 'ilm') {
    return <IlmModal {...options} />;
  }

  return <InheritModal {...options} />;
}

const isInvalidRetention = (value: string) => {
  const num = Number(value);
  return isNaN(num) || num < 1 || num % 1 > 0;
};

function DslModal({ closeModal, definition, updateInProgress, updateLifecycle }: ModalOptions) {
  const modalTitleId = useGeneratedHtmlId();

  const timeUnits = [
    { name: 'Days', value: 'd' },
    { name: 'Hours', value: 'h' },
    { name: 'Minutes', value: 'm' },
    { name: 'Seconds', value: 's' },
  ];

  const existingRetention = isDslLifecycle(definition.stream.ingest.lifecycle)
    ? parseDuration(definition.stream.ingest.lifecycle.dsl.data_retention)
    : undefined;
  const [selectedUnit, setSelectedUnit] = useState(
    (existingRetention && timeUnits.find((unit) => unit.value === existingRetention.unit)) ||
      timeUnits[0]
  );
  const [retentionValue, setRetentionValue] = useState(
    (existingRetention && existingRetention.value?.toString()) || '1'
  );
  const [noRetention, toggleNoRetention] = useToggle(
    isDslLifecycle(definition.stream.ingest.lifecycle) && !existingRetention
  );
  const [showUnitMenu, { on: openUnitMenu, off: closeUnitMenu }] = useBoolean(false);
  const invalidRetention = useMemo(
    () => isInvalidRetention(retentionValue) && !noRetention,
    [retentionValue, noRetention]
  );

  return (
    <EuiModal onClose={closeModal} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.streams.streamDetailLifecycle.editRetention', {
            defaultMessage: 'Edit data retention for stream',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {i18n.translate('xpack.streams.streamDetailLifecycle.setCustomDsl', {
          defaultMessage: 'Specify a custom data retention period for this stream.',
        })}
        <EuiSpacer />
        <EuiFieldText
          data-test-subj="streamsAppDslModalDaysField"
          value={retentionValue}
          onChange={(e) => setRetentionValue(e.target.value)}
          disabled={noRetention}
          fullWidth
          isInvalid={invalidRetention}
          append={
            <EuiPopover
              isOpen={showUnitMenu}
              panelPaddingSize="none"
              closePopover={closeUnitMenu}
              button={
                <EuiButton
                  data-test-subj="streamsAppDslModalButton"
                  disabled={noRetention}
                  iconType="arrowDown"
                  iconSide="right"
                  color="text"
                  onClick={openUnitMenu}
                >
                  {selectedUnit.name}
                </EuiButton>
              }
            >
              <EuiContextMenuPanel
                size="s"
                items={timeUnits.map((unit) => (
                  <EuiContextMenuItem
                    key={unit.value}
                    icon={selectedUnit.value === unit.value ? 'check' : 'empty'}
                    onClick={() => {
                      closeUnitMenu();
                      setSelectedUnit(unit);
                    }}
                  >
                    {unit.name}
                  </EuiContextMenuItem>
                ))}
              />
            </EuiPopover>
          }
        />
        {invalidRetention ? (
          <>
            <EuiSpacer size="xs" />
            <EuiText color="danger" size="xs">
              {i18n.translate('xpack.streams.streamDetailLifecycle.invalidRetentionValue', {
                defaultMessage: 'A positive integer is required',
              })}
            </EuiText>
          </>
        ) : null}
        <EuiSpacer />
        <EuiSwitch
          label={i18n.translate('xpack.streams.streamDetailLifecycle.keepDataIndefinitely', {
            defaultMessage: 'Keep data indefinitely',
          })}
          checked={noRetention}
          onChange={() => toggleNoRetention()}
        />
        <EuiSpacer />
      </EuiModalBody>

      <ModalFooter
        definition={definition}
        confirmationLabel="Save"
        closeModal={closeModal}
        confirmationIsDisabled={invalidRetention}
        onConfirm={() => {
          updateLifecycle({
            dsl: {
              data_retention: noRetention
                ? undefined
                : `${Number(retentionValue)}${selectedUnit.value}`,
            },
          });
        }}
        updateInProgress={updateInProgress}
      />
    </EuiModal>
  );
}

interface IlmOptionData {
  phases?: string;
}

function IlmModal({
  closeModal,
  updateLifecycle,
  updateInProgress,
  getIlmPolicies,
  definition,
}: ModalOptions) {
  const modalTitleId = useGeneratedHtmlId();

  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();

  const ilmLocator = share.url.locators.get<IlmLocatorParams>(ILM_LOCATOR_ID);
  const existingLifecycle = definition.stream.ingest.lifecycle;
  const [selectedPolicy, setSelectedPolicy] = useState(
    isIlmLifecycle(existingLifecycle) ? existingLifecycle.ilm.policy : undefined
  );
  const [policies, setPolicies] = useState<Array<EuiSelectableOption<IlmOptionData>>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    const phasesDescription = (phases: Phases) => {
      const desc: string[] = [];
      if (phases.hot) {
        const rolloverConditions = rolloverCondition(phases.hot.actions.rollover);
        desc.push(
          `Hot (${rolloverConditions ? 'rollover when ' + rolloverConditions : 'no rollover'})`
        );
      }
      if (phases.warm) {
        desc.push(`Warm after ${phases.warm.min_age}`);
      }
      if (phases.cold) {
        desc.push(`Cold after ${phases.cold.min_age}`);
      }
      if (phases.frozen) {
        desc.push(`Frozen after ${phases.frozen.min_age}`);
      }
      if (phases.delete) {
        desc.push(`Delete after ${phases.delete.min_age}`);
      } else {
        desc.push('Keep data indefinitely');
      }

      return desc.join(', ');
    };

    setIsLoading(true);
    getIlmPolicies()
      .then((ilmPolicies) => {
        const policyOptions = ilmPolicies.map(
          ({ name, policy }): EuiSelectableOption<IlmOptionData> => ({
            label: `${name}`,
            searchableLabel: name,
            checked: selectedPolicy === name ? 'on' : undefined,
            data: {
              phases: phasesDescription(policy.phases),
            },
          })
        );

        setPolicies(policyOptions);
      })
      .catch((error) => {
        setErrorMessage(getFormattedError(error).message);
      })
      .finally(() => setIsLoading(false));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EuiModal onClose={closeModal} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.streams.streamDetailLifecycle.attachIlm', {
            defaultMessage: 'Attach a lifecycle policy to this stream',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {i18n.translate('xpack.streams.streamDetailLifecycle.selectIlmOrVisit1', {
          defaultMessage: 'Select a pre-defined policy or visit',
        })}{' '}
        <EuiLink
          data-test-subj="streamsAppIlmModalIndexLifecyclePoliciesLink"
          target="_blank"
          href={ilmLocator?.getRedirectUrl({ page: 'policies_list' })}
        >
          {i18n.translate('xpack.streams.streamDetailLifecycle.selectIlmOrVisit2', {
            defaultMessage: 'Index Lifecycle Policies',
          })}
        </EuiLink>{' '}
        {i18n.translate('xpack.streams.streamDetailLifecycle.selectIlmOrVisit3', {
          defaultMessage: 'to create a new one.',
        })}
        <EuiSpacer />
        <EuiPanel hasBorder hasShadow={false} paddingSize="s">
          <EuiSelectable
            searchable
            singleSelection
            isLoading={isLoading}
            options={policies}
            errorMessage={errorMessage}
            onChange={(options) => {
              setSelectedPolicy(options.find((option) => option.checked === 'on')?.label);
              setPolicies(options);
            }}
            listProps={{
              rowHeight: 45,
            }}
            renderOption={(option: EuiSelectableOption<IlmOptionData>, searchValue: string) => (
              <>
                <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
                <EuiText size="xs" color="subdued" className="eui-displayBlock">
                  <small>
                    <EuiHighlight search={searchValue}>{option.phases || ''}</EuiHighlight>
                  </small>
                </EuiText>
              </>
            )}
          >
            {(list, search) => (
              <>
                {search}
                {list}
              </>
            )}
          </EuiSelectable>
        </EuiPanel>
      </EuiModalBody>

      <ModalFooter
        definition={definition}
        confirmationLabel="Attach policy"
        closeModal={closeModal}
        onConfirm={() => {
          if (selectedPolicy) {
            updateLifecycle({ ilm: { policy: selectedPolicy } });
          }
        }}
        confirmationIsDisabled={!selectedPolicy}
        updateInProgress={updateInProgress}
      />
    </EuiModal>
  );
}

function InheritModal({ definition, ...options }: ModalOptions) {
  if (Streams.WiredStream.GetResponse.is(definition)) {
    return <InheritModalWired definition={definition} {...options} />;
  } else if (Streams.UnwiredStream.GetResponse.is(definition)) {
    return <InheritModalUnwired definition={definition} {...options} />;
  }
}

function InheritModalWired({
  definition,
  closeModal,
  updateInProgress,
  updateLifecycle,
}: ModalOptions & { definition: Streams.WiredStream.GetResponse }) {
  const modalTitleId = useGeneratedHtmlId();

  const { wiredStreams, isLoading: wiredStreamsLoading } = useWiredStreams();

  const parents = useMemo(() => {
    if (wiredStreamsLoading || !wiredStreams) {
      return undefined;
    }

    const ancestors = getAncestors(definition.stream.name);
    return wiredStreams.filter((stream) => ancestors.includes(stream.name));
  }, [definition, wiredStreams, wiredStreamsLoading]);

  return (
    <EuiModal onClose={closeModal} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.streams.streamDetailLifecycle.defaultLifecycleTitle', {
            defaultMessage: 'Set data retention to default',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {i18n.translate('xpack.streams.streamDetailLifecycle.defaultLifecycleWiredDesc', {
          defaultMessage:
            'All custom retention settings for this stream will be removed, resetting it to inherit data retention from',
        })}{' '}
        {wiredStreamsLoading || !parents ? (
          <EuiLoadingSpinner size="s" />
        ) : (
          <>
            <LinkToStream
              name={
                findInheritedLifecycle(
                  {
                    ...definition.stream,
                    ingest: { ...definition.stream.ingest, lifecycle: { inherit: {} } },
                  },
                  parents
                ).from
              }
            />
            .
          </>
        )}
      </EuiModalBody>

      <ModalFooter
        definition={definition}
        confirmationLabel={i18n.translate(
          'xpack.streams.streamDetailLifecycle.defaultLifecycleAction',
          {
            defaultMessage: 'Set to default',
          }
        )}
        closeModal={closeModal}
        onConfirm={() => updateLifecycle({ inherit: {} })}
        updateInProgress={updateInProgress}
      />
    </EuiModal>
  );
}

function InheritModalUnwired({
  definition,
  closeModal,
  updateInProgress,
  updateLifecycle,
}: ModalOptions & { definition: Streams.UnwiredStream.GetResponse }) {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiModal onClose={closeModal} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.streams.streamDetailLifecycle.defaultLifecycleTitle', {
            defaultMessage: 'Set data retention to default',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {i18n.translate('xpack.streams.streamDetailLifecycle.defaultLifecycleUnwiredDesc', {
          defaultMessage:
            'All custom retention settings for this stream will be removed, resetting it to use the configuration of the template.',
        })}
      </EuiModalBody>

      <ModalFooter
        definition={definition}
        confirmationLabel="Set to default"
        closeModal={closeModal}
        onConfirm={() => updateLifecycle({ inherit: {} })}
        updateInProgress={updateInProgress}
      />
    </EuiModal>
  );
}

function ModalFooter({
  definition,
  updateInProgress,
  confirmationLabel,
  confirmationIsDisabled,
  onConfirm,
  closeModal,
}: {
  definition: Streams.all.GetResponse;
  updateInProgress: boolean;
  confirmationLabel: string;
  confirmationIsDisabled?: boolean;
  onConfirm: () => void;
  closeModal: () => void;
}) {
  const { wiredStreams, isLoading: wiredStreamsLoading } = useWiredStreams();
  const inheritingStreams = useMemo(() => {
    if (!Streams.WiredStream.GetResponse.is(definition) || wiredStreamsLoading || !wiredStreams) {
      return [];
    }
    return findInheritingStreams(
      definition.stream,
      wiredStreams.filter(Streams.WiredStream.Definition.is)
    ).filter((name) => name !== definition.stream.name);
  }, [definition, wiredStreams, wiredStreamsLoading]);

  return (
    <EuiModalFooter>
      <EuiFlexGroup direction="column">
        {Streams.WiredStream.GetResponse.is(definition) ? (
          <EuiFlexItem>
            <EuiCallOut
              title={i18n.translate(
                'xpack.streams.streamDetailLifecycle.lifecycleDependentImpactTitle',
                {
                  defaultMessage: 'Retention changes for dependent streams',
                }
              )}
              iconType="logstashFilter"
            >
              <p>
                {i18n.translate(
                  'xpack.streams.streamDetailLifecycle.lifecycleDependentImpactDesc',
                  {
                    defaultMessage:
                      'Data retention changes will apply to dependant streams unless they already have custom retention settings in place.',
                  }
                )}

                <EuiSpacer />

                {wiredStreamsLoading ? (
                  <EuiLoadingSpinner size="s" />
                ) : inheritingStreams.length > 0 ? (
                  <>
                    {i18n.translate('xpack.streams.streamDetailLifecycle.inheritingChildStreams', {
                      defaultMessage: 'The following child streams will be updated:',
                    })}{' '}
                    {inheritingStreams.map((name) => (
                      <>
                        {' '}
                        <LinkToStream name={name} />{' '}
                      </>
                    ))}
                    .
                  </>
                ) : (
                  'No child streams will be updated.'
                )}
              </p>
            </EuiCallOut>
          </EuiFlexItem>
        ) : null}

        <EuiFlexItem>
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
                onClick={() => onConfirm()}
              >
                {confirmationLabel}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiModalFooter>
  );
}

function LinkToStream({ name }: { name: string }) {
  const router = useStreamsAppRouter();

  return (
    <EuiLink
      data-test-subj="streamsAppLinkToStreamLink"
      target="_blank"
      href={router.link('/{key}/{tab}', {
        path: {
          key: name,
          tab: 'overview',
        },
      })}
    >
      [{name}]
    </EuiLink>
  );
}