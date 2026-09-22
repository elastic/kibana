/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { IlmPolicyPhases, PhaseName } from '@kbn/streams-schema';
import { useGeneratedHtmlId } from '@elastic/eui';
import { FormProvider, useForm, useFormState, useWatch, type FieldPath } from 'react-hook-form';
import { PHASE_ORDER } from '@kbn/data-lifecycle-phases';
import type { EditIlmPhasesFlyoutProps } from './types';
import {
  createMapFormValuesToIlmPolicyPhases,
  getIlmPhasesFlyoutFormSchema,
  ILM_PHASES_FLYOUT_TAB_ERROR_INDICATOR_WATCH_PATHS,
  type IlmPhasesFlyoutFormInternal,
  mapIlmPolicyPhasesToFormValues,
  useIlmPhasesFlyoutTabErrors,
  zodResolver,
} from './form';
import { DEFAULT_NEW_PHASE_MIN_AGE } from './constants';
import { GlobalFieldsMount, PhasePanel } from './sections';
import { useDataPhasesFlyoutStyles } from '../shared';
import {
  type EditDataPhasesFlyoutChangeMeta,
  FlyoutShell,
  getDoubledDurationFromPrevious,
  PhaseTabsRow,
  syncSelectedPhase,
  type PreservedTimeUnit,
} from '../shared';
import { useDebouncedOnChangeEmit } from '../shared/use_debounced_on_change_emit';

export const EditIlmPhasesFlyout = ({
  initialPhases,
  selectedPhase,
  setSelectedPhase,
  onChange,
  onSave,
  onClose,
  onChangeDebounceMs = 250,
  isSaving,
  isMetricsStream,
  canCreateRepository = false,
  searchableSnapshotRepositories = [],
  isLoadingSearchableSnapshotRepositories,
  onRefreshSearchableSnapshotRepositories,
  onCreateSnapshotRepository,
  'data-test-subj': dataTestSubjProp,
}: EditIlmPhasesFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'streamsEditIlmPhasesFlyoutTitle' });
  const formId = useGeneratedHtmlId({ prefix: 'streamsEditIlmPhasesFlyoutForm' });
  const dataTestSubj = dataTestSubjProp ?? 'streamsEditIlmPhasesFlyout';
  const { sectionStyles } = useDataPhasesFlyoutStyles();

  const initialPhasesRef = useRef<IlmPolicyPhases>(initialPhases);

  const schema = useMemo(() => getIlmPhasesFlyoutFormSchema(), []);
  const mapFormValuesToIlmPolicyPhases = useMemo(
    () => createMapFormValuesToIlmPolicyPhases(initialPhasesRef.current),
    []
  );

  const methods = useForm<IlmPhasesFlyoutFormInternal>({
    defaultValues: mapIlmPolicyPhasesToFormValues(initialPhasesRef.current),
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    shouldUnregister: false,
  });

  const { errors, isSubmitting } = useFormState({ control: methods.control });

  const formData = useWatch({ control: methods.control });

  useWatch({ control: methods.control, name: ILM_PHASES_FLYOUT_TAB_ERROR_INDICATOR_WATCH_PATHS });

  const meta = formData?._meta;
  const isMetaReady = Boolean(meta);

  const enabledPhases = useMemo(
    () =>
      isMetaReady
        ? PHASE_ORDER.filter((p) => {
            const enabled = meta?.[p]?.enabled;
            return Boolean(enabled);
          })
        : [],
    [isMetaReady, meta]
  );

  const { tabHasErrors } = useIlmPhasesFlyoutTabErrors(formData, errors);
  const buildInvalidPhases = useCallback(
    () => PHASE_ORDER.filter((p) => tabHasErrors(p)),
    [tabHasErrors]
  );

  const buildMeta = useCallback<() => EditDataPhasesFlyoutChangeMeta>(
    () => ({ invalidPhases: buildInvalidPhases() }),
    [buildInvalidPhases]
  );

  useDebouncedOnChangeEmit<IlmPolicyPhases, EditDataPhasesFlyoutChangeMeta>({
    getOutput: () => mapFormValuesToIlmPolicyPhases(methods.getValues()),
    initialOutput: initialPhasesRef.current,
    onChange,
    buildMeta,
    onChangeDebounceMs,
    emitSignal: meta ? formData : null,
  });

  const canSelectFrozen = canCreateRepository || searchableSnapshotRepositories.length > 0;

  const getDefaultMinAgeForPhase = useCallback(
    (phase: PhaseName): { value: string; unit: PreservedTimeUnit } => {
      const phases: Array<'warm' | 'cold' | 'frozen' | 'delete'> = [
        'warm',
        'cold',
        'frozen',
        'delete',
      ];
      const index = phases.indexOf(phase as (typeof phases)[number]);
      if (index <= 0) return DEFAULT_NEW_PHASE_MIN_AGE;

      // Default to 2x the closest enabled previous phase's min_age.
      const previousPhases = phases.slice(0, index).reverse();
      const values = methods.getValues();

      for (const previousPhase of previousPhases) {
        const isPhaseEnabled = Boolean(values._meta[previousPhase].enabled);
        if (!isPhaseEnabled) continue;

        const previousValue = String(values._meta[previousPhase].minAgeValue ?? '').trim();
        if (previousValue === '') continue;

        const previousUnit = String(
          values._meta[previousPhase].minAgeUnit ?? 'd'
        ) as PreservedTimeUnit;

        const previousNum = Number(previousValue);
        if (!Number.isFinite(previousNum) || previousNum < 0) continue;

        const { value, unit } = getDoubledDurationFromPrevious({
          previousValue,
          previousUnit,
          previousValueFallback: previousNum,
          previousValueMinInclusive: 0,
        });
        return { value, unit };
      }

      return DEFAULT_NEW_PHASE_MIN_AGE;
    },
    [methods]
  );

  const ensurePhaseEnabledWithDefaults = useCallback(
    (phase: PhaseName): boolean => {
      if (phase === 'frozen' && !canSelectFrozen) {
        return false;
      }

      if (enabledPhases.includes(phase)) {
        return true;
      }

      methods.setValue(`_meta.${phase}.enabled`, true);

      if (phase === 'frozen' && searchableSnapshotRepositories.length === 1) {
        const currentValue = String(
          methods.getValues('_meta.searchableSnapshot.repository') ?? ''
        ).trim();
        if (currentValue === '') {
          methods.setValue(
            '_meta.searchableSnapshot.repository',
            searchableSnapshotRepositories[0]
          );
        }
      }

      if (phase !== 'hot') {
        const valuePath =
          `_meta.${phase}.minAgeValue` satisfies FieldPath<IlmPhasesFlyoutFormInternal>;
        const unitPath =
          `_meta.${phase}.minAgeUnit` satisfies FieldPath<IlmPhasesFlyoutFormInternal>;

        // When enabling a previously-disabled phase, preserve existing values.
        // Otherwise default based on the closest enabled previous phase.
        if (String(methods.getValues(valuePath) ?? '').trim() === '') {
          const { value, unit } = getDefaultMinAgeForPhase(phase);
          methods.setValue(valuePath, value);
          methods.setValue(unitPath, unit);
        }
      }

      // Force re-validation for the (re-)enabled phase.
      // Phases are not unmounted when disabled, so fields may have been validated while the phase
      // was disabled (validators no-op) and would otherwise remain "valid" when re-enabled.
      const fieldsToValidate: Array<FieldPath<IlmPhasesFlyoutFormInternal>> = [];
      if (phase !== 'hot') {
        fieldsToValidate.push(`_meta.${phase}.minAgeValue`);
      }
      if (phase === 'hot' || phase === 'warm' || phase === 'cold') {
        fieldsToValidate.push(`_meta.${phase}.downsample.fixedIntervalValue`);
      }
      if (phase === 'cold' || phase === 'frozen') {
        fieldsToValidate.push('_meta.searchableSnapshot.repository');
      }
      if (fieldsToValidate.length > 0) {
        // Delay to the next tick so RHF updates are visible to dependent validations.
        setTimeout(() => {
          void methods.trigger(fieldsToValidate);
        }, 0);
      }

      return true;
    },
    [
      canSelectFrozen,
      enabledPhases,
      getDefaultMinAgeForPhase,
      methods,
      searchableSnapshotRepositories,
    ]
  );

  useEffect(() => {
    if (!meta) return;
    if (enabledPhases.length === 0) return;

    if (!selectedPhase) {
      setSelectedPhase(enabledPhases[0]);
      return;
    }

    const result = syncSelectedPhase({
      selectedPhase,
      enabledPhases,
      ensurePhaseEnabledWithDefaults,
      getFallbackPhase: () => enabledPhases[0],
    });
    if (result.action === 'set') {
      setSelectedPhase(result.phase);
    }
  }, [enabledPhases, ensurePhaseEnabledWithDefaults, meta, selectedPhase, setSelectedPhase]);

  const hasFormErrors = Object.keys(errors).length > 0;
  const isSaveDisabledDueToInvalid = hasFormErrors;

  const title = i18n.translate('xpack.streams.editIlmPhasesFlyout.titleIlm', {
    defaultMessage: 'Edit ILM policy',
  });

  const tabsRow = (
    <PhaseTabsRow
      enabledPhases={enabledPhases}
      searchableSnapshotRepositories={searchableSnapshotRepositories}
      canCreateRepository={canCreateRepository}
      selectedPhase={selectedPhase}
      setSelectedPhase={setSelectedPhase}
      tabHasErrors={tabHasErrors}
      dataTestSubj={dataTestSubj}
    />
  );

  return (
    <FlyoutShell
      dataTestSubj={dataTestSubj}
      flyoutTitleId={flyoutTitleId}
      formId={formId}
      onClose={onClose}
      title={title}
      tabsRow={tabsRow}
      isSubmitting={isSubmitting}
      isSaving={isSaving}
      isSaveDisabledDueToInvalid={isSaveDisabledDueToInvalid}
    >
      <FormProvider {...methods}>
        <form
          id={formId}
          onSubmit={methods.handleSubmit((data) => onSave(mapFormValuesToIlmPolicyPhases(data)))}
          noValidate
        >
          <GlobalFieldsMount />
          {PHASE_ORDER.map((phase) => (
            <PhasePanel
              key={phase}
              phase={phase}
              selectedPhase={selectedPhase}
              enabledPhases={enabledPhases}
              setSelectedPhase={setSelectedPhase}
              dataTestSubj={dataTestSubj}
              sectionStyles={sectionStyles}
              searchableSnapshotRepositories={searchableSnapshotRepositories}
              canCreateRepository={canCreateRepository}
              isLoadingSearchableSnapshotRepositories={isLoadingSearchableSnapshotRepositories}
              onRefreshSearchableSnapshotRepositories={onRefreshSearchableSnapshotRepositories}
              onCreateSnapshotRepository={onCreateSnapshotRepository}
              isMetricsStream={isMetricsStream}
            />
          ))}
        </form>
      </FormProvider>
    </FlyoutShell>
  );
};
