/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { IlmPolicyPhases, PhaseName } from '@kbn/streams-schema';
import { Form, useForm, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { isEqual } from 'lodash';
import type { EditIlmPhasesFlyoutProps } from './types';
import {
  createIlmPhasesFlyoutDeserializer,
  createIlmPhasesFlyoutSerializer,
  getIlmPhasesFlyoutFormSchema,
  type IlmPhasesFlyoutFormInternal,
  OnFieldErrorsChangeProvider,
  useIlmPhasesFlyoutTabErrors,
} from './form';
import { ILM_PHASE_ORDER } from './constants';
import { GlobalFieldsMount, PhasePanel, PhaseTabsRow } from './sections';
import { useStyles } from './use_styles';

export const EditIlmPhasesFlyout = ({
  initialPhases,
  onChange,
  onSave,
  onClose,
  isSaving,
  searchableSnapshotRepositories = [],
  isLoadingSearchableSnapshotRepositories,
  onRefreshSearchableSnapshotRepositories,
  onCreateSnapshotRepository,
  'data-test-subj': dataTestSubjProp,
}: EditIlmPhasesFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'streamsEditIlmPhasesFlyoutTitle' });
  const dataTestSubj = dataTestSubjProp ?? 'streamsEditIlmPhasesFlyout';
  const { footerStyles, headerStyles, sectionStyles } = useStyles();

  const initialPhasesRef = useRef<IlmPolicyPhases>(initialPhases);

  const schema = useMemo(() => getIlmPhasesFlyoutFormSchema(), []);
  const serializer = useMemo(() => createIlmPhasesFlyoutSerializer(initialPhasesRef.current), []);
  const deserializer = useMemo(() => createIlmPhasesFlyoutDeserializer(), []);

  const { form } = useForm<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>({
    schema,
    defaultValue: initialPhasesRef.current,
    serializer,
    deserializer,
    onSubmit: async (data, isValid) => {
      if (!isValid) return;
      onSave(data);
    },
  });

  const enabledPhaseWatchPaths = useMemo(
    () => ILM_PHASE_ORDER.map((p) => `_meta.${p}.enabled`),
    []
  );

  const [formData] = useFormData<IlmPhasesFlyoutFormInternal, IlmPolicyPhases>({
    form,
    watch: [
      ...enabledPhaseWatchPaths,
      // Enable/disable toggles that gate validations (tabs need to update when these change).
      '_meta.hot.downsampleEnabled',
      '_meta.warm.downsampleEnabled',
      '_meta.cold.downsampleEnabled',
      '_meta.cold.searchableSnapshotEnabled',
      '_meta.searchableSnapshot.repository',
    ],
  });

  const enabledPhases = useMemo(
    () =>
      ILM_PHASE_ORDER.filter((p) => {
        const enabled = (formData as any)?._meta?.[p]?.enabled;
        return Boolean(enabled);
      }),
    [formData]
  );

  const { onFieldErrorsChange, tabHasErrors } = useIlmPhasesFlyoutTabErrors(formData);

  const lastEmittedOutputRef = useRef<IlmPolicyPhases>(initialPhasesRef.current);
  const isInitializingSubscriptionRef = useRef(true);
  const initDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const sub = form.subscribe(({ data }) => {
      const next = data.format();

      if (isInitializingSubscriptionRef.current) {
        // During initial mount, hook-form emits many intermediate values as fields mount.
        // Coalesce those updates and only start emitting once mounting has stabilized.
        lastEmittedOutputRef.current = next;

        if (initDebounceTimeoutRef.current) {
          clearTimeout(initDebounceTimeoutRef.current);
        }
        initDebounceTimeoutRef.current = setTimeout(() => {
          isInitializingSubscriptionRef.current = false;
        }, 0);
        return;
      }

      if (isEqual(next, lastEmittedOutputRef.current)) return;
      lastEmittedOutputRef.current = next;

      onChange(next);
    });

    return () => {
      sub.unsubscribe();
      if (initDebounceTimeoutRef.current) {
        clearTimeout(initDebounceTimeoutRef.current);
        initDebounceTimeoutRef.current = undefined;
      }
    };
  }, [form, onChange]);

  const [selectedIlmPhase, setSelectedIlmPhase] = useState<PhaseName | undefined>(undefined);
  const pendingSelectedIlmPhaseRef = useRef<PhaseName | null>(null);

  useEffect(() => {
    if (enabledPhases.length === 0) {
      pendingSelectedIlmPhaseRef.current = null;
      setSelectedIlmPhase(undefined);
      return;
    }

    // If we just added a phase, wait until it appears in enabledPhases before auto-selecting fallback.
    if (
      pendingSelectedIlmPhaseRef.current &&
      enabledPhases.includes(pendingSelectedIlmPhaseRef.current)
    ) {
      pendingSelectedIlmPhaseRef.current = null;
    }

    if (!selectedIlmPhase) {
      setSelectedIlmPhase(enabledPhases[0]);
      return;
    }

    if (!enabledPhases.includes(selectedIlmPhase)) {
      if (pendingSelectedIlmPhaseRef.current === selectedIlmPhase) {
        return;
      }
      setSelectedIlmPhase(enabledPhases[0]);
    }
  }, [enabledPhases, selectedIlmPhase]);

  return (
    <EuiFlyout
      type="push"
      size="s"
      paddingSize="none"
      ownFocus={false}
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      data-test-subj={dataTestSubj}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup direction="column" gutterSize="s" responsive={false} css={headerStyles}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
              <EuiFlexItem grow={true}>
                <EuiTitle size="m">
                  <h2 id={flyoutTitleId}>
                    {i18n.translate('xpack.streams.editIlmPhasesFlyout.title', {
                      defaultMessage: 'Edit data phases',
                    })}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <PhaseTabsRow
              form={form}
              enabledPhases={enabledPhases}
              selectedIlmPhase={selectedIlmPhase}
              setSelectedIlmPhase={setSelectedIlmPhase}
              pendingSelectedIlmPhaseRef={pendingSelectedIlmPhaseRef}
              tabHasErrors={tabHasErrors}
              dataTestSubj={dataTestSubj}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <Form form={form}>
          <OnFieldErrorsChangeProvider value={onFieldErrorsChange}>
            <GlobalFieldsMount />

            {ILM_PHASE_ORDER.map((phase) => (
              <PhasePanel
                key={phase}
                phase={phase}
                selectedPhase={selectedIlmPhase}
                enabledPhases={enabledPhases}
                setSelectedIlmPhase={setSelectedIlmPhase}
                form={form}
                dataTestSubj={dataTestSubj}
                sectionStyles={sectionStyles}
                searchableSnapshotRepositories={searchableSnapshotRepositories}
                isLoadingSearchableSnapshotRepositories={isLoadingSearchableSnapshotRepositories}
                onRefreshSearchableSnapshotRepositories={onRefreshSearchableSnapshotRepositories}
                onCreateSnapshotRepository={onCreateSnapshotRepository}
              />
            ))}
          </OnFieldErrorsChangeProvider>
        </Form>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          responsive={false}
          css={footerStyles}
        >
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj={`${dataTestSubj}CancelButton`}
              onClick={onClose}
              flush="left"
            >
              {i18n.translate('xpack.streams.editIlmPhasesFlyout.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isLoading={Boolean(isSaving) || form.isSubmitting}
              data-test-subj={`${dataTestSubj}SaveButton`}
              onClick={() => form.submit()}
              disabled={(form.isSubmitted && form.isValid === false) || form.isSubmitting}
            >
              {i18n.translate('xpack.streams.editIlmPhasesFlyout.save', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
