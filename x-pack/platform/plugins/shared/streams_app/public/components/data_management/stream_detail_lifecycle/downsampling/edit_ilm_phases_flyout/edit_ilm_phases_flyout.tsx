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
  EuiToolTip,
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
  useIlmPhasesFlyoutTabErrors,
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
  const dataTestSubj = dataTestSubjProp ?? 'streamsEditIlmPhasesFlyout';
  const { footerStyles, headerStyles, sectionStyles, phaseDescriptionStyles } = useStyles();

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

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const lastEmittedOutputRef = useRef<IlmPolicyPhases>(initialPhasesRef.current);
  const pendingOnChangeOutputRef = useRef<IlmPolicyPhases | null>(null);
  const pendingOnChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sub = form.subscribe(({ data }) => {
      const next = data.format();

      if (isEqual(next, lastEmittedOutputRef.current)) return;

      pendingOnChangeOutputRef.current = next;
      if (pendingOnChangeTimeoutRef.current) {
        clearTimeout(pendingOnChangeTimeoutRef.current);
      }

      pendingOnChangeTimeoutRef.current = setTimeout(() => {
        pendingOnChangeTimeoutRef.current = null;
        const toEmit = pendingOnChangeOutputRef.current;
        pendingOnChangeOutputRef.current = null;
        if (!toEmit) return;
        if (isEqual(toEmit, lastEmittedOutputRef.current)) return;
        lastEmittedOutputRef.current = toEmit;
        onChangeRef.current(toEmit);
      }, onChangeDebounceMs);
    });

    return () => {
      if (pendingOnChangeTimeoutRef.current) {
        clearTimeout(pendingOnChangeTimeoutRef.current);
        pendingOnChangeTimeoutRef.current = null;
      }
      pendingOnChangeOutputRef.current = null;
      sub.unsubscribe();
    };
  }, [form, onChangeDebounceMs]);

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
      const fields = form.getFields();

      for (const previousPhase of previousPhases) {
        const isPhaseEnabled = Boolean(fields[`_meta.${previousPhase}.enabled`]?.value);
        if (!isPhaseEnabled) continue;

        const previousValue = String(
          fields[`_meta.${previousPhase}.minAgeValue`]?.value ?? ''
        ).trim();
        if (previousValue === '') continue;

        const previousUnit = String(
          fields[`_meta.${previousPhase}.minAgeUnit`]?.value ?? 'd'
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
    [form]
  );

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
        // Otherwise default based on the closest enabled previous phase.
        if (valueField && String(valueField.value ?? '').trim() === '') {
          const { value, unit } = getDefaultMinAgeForPhase(phase);
          valueField.setValue(value);
          unitField?.setValue(unit);
        }

        const resolvedValue = String(form.getFields()[valuePath]?.value ?? '');
        const resolvedUnit = String(form.getFields()[unitPath]?.value ?? 'd') as PreservedTimeUnit;
        const millis =
          resolvedValue.trim() === '' ? -1 : toMilliseconds(resolvedValue, resolvedUnit);
        form.setFieldValue(millisPath, millis);
      }

      // Force re-validation for the (re-)enabled phase.
      // Phases are not unmounted when disabled, so fields may have been validated while the phase
      // was disabled (validators no-op) and would otherwise remain "valid" when re-enabled.
      const fieldsToValidate: string[] = [];
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
        // Delay to the next tick so `hook_form_lib` has time to propagate the field value changes
        // into the form's flattened `formData` snapshot that validators read from.
        setTimeout(() => {
          void form.validateFields(fieldsToValidate, /* onlyBlocking */ true);
        }, 0);
      }

      return true;
    },
    [canSelectFrozen, enabledPhases, form, getDefaultMinAgeForPhase, searchableSnapshotRepositories]
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

  const hasFormErrors = form.getErrors().length > 0;
  const isSaveDisabledDueToInvalid = form.isValid === false || hasFormErrors;
  const isSaveDisabled = isSaveDisabledDueToInvalid || form.isSubmitting;

  const renderSaveButton = () => {
    const button = (
      <EuiButton
        fill
        isLoading={Boolean(isSaving) || form.isSubmitting}
        data-test-subj={`${dataTestSubj}SaveButton`}
        onClick={() => form.submit()}
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
                isMetricsStream={isMetricsStream}
                phaseDescriptionStyles={phaseDescriptionStyles}
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
          <EuiFlexItem grow={false}>{renderSaveButton()}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
