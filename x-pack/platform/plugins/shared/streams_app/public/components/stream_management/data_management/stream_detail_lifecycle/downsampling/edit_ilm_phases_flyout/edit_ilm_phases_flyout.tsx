/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { IlmPolicyPhases, PhaseName } from '@kbn/streams-schema';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiToolTip,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { isEqual } from 'lodash';
import { FormProvider, useForm, useFormState, useWatch, type FieldPath } from 'react-hook-form';
import type { EditIlmPhasesFlyoutChangeMeta, EditIlmPhasesFlyoutProps } from './types';
import {
  createMapFormValuesToIlmPolicyPhases,
  getIlmPhasesFlyoutFormSchema,
  ILM_PHASES_FLYOUT_TAB_ERROR_INDICATOR_WATCH_PATHS,
  type IlmPhasesFlyoutFormInternal,
  mapIlmPolicyPhasesToFormValues,
  useIlmPhasesFlyoutTabErrors,
  zodResolver,
} from './form';
import { DEFAULT_NEW_PHASE_MIN_AGE, ILM_PHASE_ORDER } from './constants';
import { GlobalFieldsMount, PhasePanel, PhaseTabsRow } from './sections';
import { useStyles } from './use_styles';
import { getDoubledDurationFromPrevious, type PreservedTimeUnit } from '../shared';

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
  const { footerStyles, headerStyles, sectionStyles } = useStyles();

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
        ? ILM_PHASE_ORDER.filter((p) => {
            const enabled = meta?.[p]?.enabled;
            return Boolean(enabled);
          })
        : [],
    [isMetaReady, meta]
  );

  const { tabHasErrors } = useIlmPhasesFlyoutTabErrors(formData, errors);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const buildInvalidPhases = useCallback(
    () => ILM_PHASE_ORDER.filter((p) => tabHasErrors(p)),
    [tabHasErrors]
  );

  const lastEmittedMetaRef = useRef<EditIlmPhasesFlyoutChangeMeta>({
    invalidPhases: [],
  });

  const lastEmittedOutputRef = useRef<IlmPolicyPhases>(initialPhasesRef.current);
  const pendingOnChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOnChangeEmitScheduledRef = useRef(false);
  const pendingOnChangeEmitScheduleIdRef = useRef(0);

  const scheduleOnChangeEmit = useCallback(() => {
    pendingOnChangeEmitScheduleIdRef.current += 1;
    const scheduledId = pendingOnChangeEmitScheduleIdRef.current;

    if (pendingOnChangeTimeoutRef.current) {
      clearTimeout(pendingOnChangeTimeoutRef.current);
      pendingOnChangeTimeoutRef.current = null;
    }

    pendingOnChangeEmitScheduledRef.current = true;

    const emit = () => {
      pendingOnChangeEmitScheduledRef.current = false;
      const toEmit = mapFormValuesToIlmPolicyPhases(methods.getValues());

      const metaToEmit: EditIlmPhasesFlyoutChangeMeta = {
        invalidPhases: buildInvalidPhases(),
      };

      if (
        isEqual(toEmit, lastEmittedOutputRef.current) &&
        isEqual(metaToEmit, lastEmittedMetaRef.current)
      ) {
        return;
      }

      lastEmittedOutputRef.current = toEmit;
      lastEmittedMetaRef.current = metaToEmit;
      onChangeRef.current(toEmit, metaToEmit);
    };

    if (onChangeDebounceMs === 0) {
      pendingOnChangeTimeoutRef.current = setTimeout(() => {
        pendingOnChangeTimeoutRef.current = null;
        if (pendingOnChangeEmitScheduleIdRef.current !== scheduledId) return;
        emit();
      }, 0);
      return;
    }

    pendingOnChangeTimeoutRef.current = setTimeout(() => {
      pendingOnChangeTimeoutRef.current = null;
      if (pendingOnChangeEmitScheduleIdRef.current !== scheduledId) return;
      emit();
    }, onChangeDebounceMs);
  }, [buildInvalidPhases, mapFormValuesToIlmPolicyPhases, methods, onChangeDebounceMs]);

  useEffect(() => {
    return () => {
      if (pendingOnChangeTimeoutRef.current) {
        clearTimeout(pendingOnChangeTimeoutRef.current);
        pendingOnChangeTimeoutRef.current = null;
      }
      pendingOnChangeEmitScheduledRef.current = false;
      pendingOnChangeEmitScheduleIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!meta) return;
    scheduleOnChangeEmit();
  }, [formData, meta, scheduleOnChangeEmit]);

  useEffect(() => {
    // Re-emit meta when tab errors change without any form data change.
    // If we already have a scheduled emit (due to form changes), that emit will compute meta at
    // emit-time, so we don't need to reschedule.
    if (pendingOnChangeEmitScheduledRef.current) return;
    scheduleOnChangeEmit();
  }, [buildInvalidPhases, scheduleOnChangeEmit]);

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

    const isPhaseCorrectlyEnabled = ensurePhaseEnabledWithDefaults(selectedPhase);
    if (!isPhaseCorrectlyEnabled) {
      setSelectedPhase(enabledPhases[0]);
    }
  }, [enabledPhases, ensurePhaseEnabledWithDefaults, meta, selectedPhase, setSelectedPhase]);

  const hasFormErrors = Object.keys(errors).length > 0;
  const isSaveDisabledDueToInvalid = hasFormErrors;
  const isSaveDisabled = isSaveDisabledDueToInvalid || isSubmitting;

  const renderSaveButton = () => {
    const button = (
      <EuiButton
        fill
        type="submit"
        form={formId}
        isLoading={Boolean(isSaving) || isSubmitting}
        data-test-subj={`${dataTestSubj}SaveButton`}
        disabled={isSaveDisabled}
      >
        {i18n.translate('xpack.streams.editIlmPhasesFlyout.save', {
          defaultMessage: 'Save',
        })}
      </EuiButton>
    );

    return isSaveDisabledDueToInvalid ? (
      <EuiToolTip
        content={i18n.translate('xpack.streams.editIlmPhasesFlyout.saveDisabledTooltip', {
          defaultMessage: 'Fix the form errors before saving.',
        })}
      >
        {button}
      </EuiToolTip>
    ) : (
      button
    );
  };

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
        <FormProvider {...methods}>
          <form
            id={formId}
            onSubmit={methods.handleSubmit((data) => onSave(mapFormValuesToIlmPolicyPhases(data)))}
            noValidate
          >
            <GlobalFieldsMount />

            {ILM_PHASE_ORDER.map((phase) => (
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
              type="button"
              data-test-subj={`${dataTestSubj}CancelButton`}
              onClick={onClose}
              flush="left"
            >
              {i18n.translate('xpack.streams.editIlmPhasesFlyout.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{renderSaveButton()}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
