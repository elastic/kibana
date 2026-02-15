/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
  toMilliseconds,
  type TimeUnit,
  useIlmPhasesFlyoutTabErrors,
} from './form';
import { DEFAULT_NEW_PHASE_MIN_AGE, ILM_PHASE_ORDER } from './constants';
import { GlobalFieldsMount, PhasePanel, PhaseTabsRow } from './sections';
import { useStyles } from './use_styles';

export const EditIlmPhasesFlyout = ({
  initialPhases,
  selectedPhase,
  setSelectedPhase,
  onChange,
  onSave,
  onClose,
  isSaving,
  canCreateRepository = false,
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

  const meta = (formData as Partial<IlmPhasesFlyoutFormInternal> | undefined)?._meta;
  const isMetaReady = Boolean(meta);

  const enabledPhases = useMemo(
    () =>
      isMetaReady
        ? ILM_PHASE_ORDER.filter((p) => {
            const enabled = meta?.[p]?.enabled;
            return Boolean(enabled);
          })
        : [],
    [isMetaReady, meta]
  );

  const { onFieldErrorsChange, tabHasErrors } = useIlmPhasesFlyoutTabErrors(formData);

  const lastEmittedOutputRef = useRef<IlmPolicyPhases>(initialPhasesRef.current);

  useEffect(() => {
    const sub = form.subscribe(({ data }) => {
      const next = data.format();

      if (isEqual(next, lastEmittedOutputRef.current)) return;
      lastEmittedOutputRef.current = next;

      onChange(next);
    });

    return () => {
      sub.unsubscribe();
    };
  }, [form, onChange]);

  const canSelectFrozen = canCreateRepository || searchableSnapshotRepositories.length > 0;

  const getDefaultMinAge = useCallback((): { value: string; unit: TimeUnit } => {
    const candidates: Array<'warm' | 'cold' | 'frozen' | 'delete'> = [
      'warm',
      'cold',
      'frozen',
      'delete',
    ];
    let last: { value: string; unit: TimeUnit } | undefined;

    candidates.forEach((p) => {
      const isPhaseEnabled = Boolean(form.getFields()[`_meta.${p}.enabled`]?.value);
      if (!isPhaseEnabled) return;

      const value = String(form.getFields()[`_meta.${p}.minAgeValue`]?.value ?? '').trim();
      const unit = (form.getFields()[`_meta.${p}.minAgeUnit`]?.value ?? 'd') as TimeUnit;
      if (value) {
        last = { value, unit };
      }
    });

    return last ?? DEFAULT_NEW_PHASE_MIN_AGE;
  }, [form]);

  const ensurePhaseEnabledWithDefaults = useCallback(
    (phase: PhaseName): boolean => {
      if (phase === 'frozen' && !canSelectFrozen) {
        return false;
      }

      if (enabledPhases.includes(phase)) {
        return true;
      }

      form.setFieldValue(`_meta.${phase}.enabled`, true);

      if (phase === 'frozen' && searchableSnapshotRepositories.length === 1) {
        const repositoryField = form.getFields()['_meta.searchableSnapshot.repository'];
        const currentValue = String(repositoryField?.value ?? '').trim();
        if (repositoryField && currentValue === '') {
          repositoryField.setValue(searchableSnapshotRepositories[0]);
        }
      }

      if (phase !== 'hot') {
        const valuePath = `_meta.${phase}.minAgeValue`;
        const unitPath = `_meta.${phase}.minAgeUnit`;
        const millisPath = `_meta.${phase}.minAgeToMilliSeconds`;

        const valueField = form.getFields()[valuePath];
        const unitField = form.getFields()[unitPath];

        // When enabling a previously-disabled phase, preserve existing values.
        // Otherwise default to the last configured min_age (or 30d).
        if (valueField && String(valueField.value ?? '').trim() === '') {
          const { value, unit } = getDefaultMinAge();
          valueField.setValue(value);
          unitField?.setValue(unit);
        }

        const resolvedValue = String(form.getFields()[valuePath]?.value ?? '');
        const resolvedUnit = String(form.getFields()[unitPath]?.value ?? 'd') as TimeUnit;
        const millis =
          resolvedValue.trim() === '' ? -1 : toMilliseconds(resolvedValue, resolvedUnit);
        form.setFieldValue(millisPath, millis);
      }

      return true;
    },
    [canSelectFrozen, enabledPhases, form, getDefaultMinAge, searchableSnapshotRepositories]
  );

  useEffect(() => {
    // During initial mount, `_meta` can be temporarily missing while fields mount.
    // Avoid clobbering the controlled `selectedPhase` during that transient state.
    if (!isMetaReady) return;
    if (enabledPhases.length === 0) return;

    if (!selectedPhase) {
      setSelectedPhase(enabledPhases[0]);
      return;
    }

    const isPhaseCorrectlyEnabled = ensurePhaseEnabledWithDefaults(selectedPhase);
    if (!isPhaseCorrectlyEnabled) {
      setSelectedPhase(enabledPhases[0]);
    }
  }, [enabledPhases, ensurePhaseEnabledWithDefaults, isMetaReady, selectedPhase, setSelectedPhase]);

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
              enabledPhases={enabledPhases}
              searchableSnapshotRepositories={searchableSnapshotRepositories}
              canCreateRepository={canCreateRepository}
              selectedPhase={selectedPhase}
              setSelectedPhase={setSelectedPhase}
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
                selectedPhase={selectedPhase}
                enabledPhases={enabledPhases}
                setSelectedPhase={setSelectedPhase}
                form={form}
                dataTestSubj={dataTestSubj}
                sectionStyles={sectionStyles}
                searchableSnapshotRepositories={searchableSnapshotRepositories}
                canCreateRepository={canCreateRepository}
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
