/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { IlmPolicyPhases, PhaseName } from '@kbn/streams-schema';
import {
  Form,
  type FormHook,
  UseField,
  useForm,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiIcon,
  EuiIconTip,
  EuiSwitch,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTextColor,
  EuiToolTip,
  EuiTitle,
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';
import { isEqual } from 'lodash';
import { css } from '@emotion/react';
import { IlmPhaseSelect } from '../ilm_phase_select/ilm_phase_select';
import type { EditIlmPhasesFlyoutProps } from './types';
import {
  createIlmPhasesFlyoutDeserializer,
  createIlmPhasesFlyoutSerializer,
  getIlmPhasesFlyoutFormSchema,
  type IlmPhasesFlyoutFormInternal,
  DownsampleIntervalField,
  DeleteSearchableSnapshotToggleField,
  MinAgeField,
  ReadOnlyToggleField,
  SearchableSnapshotRepositoryField,
  type OnFieldErrorsChange,
  OnFieldErrorsChangeProvider,
  useOnFieldErrorsChange,
  type TimeUnit,
  toMilliseconds,
} from './form';

const ILM_PHASE_ORDER: PhaseName[] = ['hot', 'warm', 'cold', 'frozen', 'delete'];
const READONLY_ALLOWED_PHASES: PhaseName[] = ['hot', 'warm', 'cold'];

const PHASE_LABELS: Record<PhaseName, string> = {
  hot: i18n.translate('xpack.streams.editIlmPhasesFlyout.phaseLabelHot', {
    defaultMessage: 'Hot',
  }),
  warm: i18n.translate('xpack.streams.editIlmPhasesFlyout.phaseLabelWarm', {
    defaultMessage: 'Warm',
  }),
  cold: i18n.translate('xpack.streams.editIlmPhasesFlyout.phaseLabelCold', {
    defaultMessage: 'Cold',
  }),
  frozen: i18n.translate('xpack.streams.editIlmPhasesFlyout.phaseLabelFrozen', {
    defaultMessage: 'Frozen',
  }),
  delete: i18n.translate('xpack.streams.editIlmPhasesFlyout.phaseLabelDelete', {
    defaultMessage: 'Delete',
  }),
};

const TIME_UNIT_OPTIONS: ReadonlyArray<{ value: TimeUnit; text: string }> = [
  {
    value: 'd',
    text: i18n.translate('xpack.streams.editIlmPhasesFlyout.unitDays', { defaultMessage: 'days' }),
  },
  {
    value: 'h',
    text: i18n.translate('xpack.streams.editIlmPhasesFlyout.unitHours', {
      defaultMessage: 'hours',
    }),
  },
  {
    value: 'm',
    text: i18n.translate('xpack.streams.editIlmPhasesFlyout.unitMinutes', {
      defaultMessage: 'minutes',
    }),
  },
  {
    value: 's',
    text: i18n.translate('xpack.streams.editIlmPhasesFlyout.unitSeconds', {
      defaultMessage: 'seconds',
    }),
  },
];

const DEFAULT_NEW_PHASE_MIN_AGE: { value: string; unit: TimeUnit } = { value: '30', unit: 'd' };

const GlobalFieldsMount = () => {
  const onFieldErrorsChange = useOnFieldErrorsChange();
  return (
    <>
      <UseField
        path="_meta.searchableSnapshot.repository"
        onError={(errors) => onFieldErrorsChange?.('_meta.searchableSnapshot.repository', errors)}
      >
        {() => null}
      </UseField>
    </>
  );
};

const PHASE_MOUNT_PATHS: Record<PhaseName, ReadonlyArray<string>> = {
  hot: [
    '_meta.hot.enabled',
    '_meta.hot.sizeInBytes',
    '_meta.hot.rollover',
    '_meta.hot.readonlyEnabled',
    '_meta.hot.downsampleEnabled',
  ],
  warm: [
    '_meta.warm.enabled',
    '_meta.warm.sizeInBytes',
    '_meta.warm.readonlyEnabled',
    '_meta.warm.downsampleEnabled',
  ],
  cold: [
    '_meta.cold.enabled',
    '_meta.cold.sizeInBytes',
    '_meta.cold.readonlyEnabled',
    '_meta.cold.downsampleEnabled',
    '_meta.cold.searchableSnapshotEnabled',
  ],
  frozen: ['_meta.frozen.enabled'],
  delete: ['_meta.delete.enabled', '_meta.delete.deleteSearchableSnapshotEnabled'],
};

const PhaseFieldsMount = ({ phase }: { phase: PhaseName }) => {
  return (
    <>
      {PHASE_MOUNT_PATHS[phase].map((path) => (
        <UseField key={path} path={path}>
          {() => null}
        </UseField>
      ))}
    </>
  );
};

interface DownsampleFieldSectionProps {
  form: FormHook<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>;
  phaseName: 'hot' | 'warm' | 'cold';
  dataTestSubj: string;
}

const DownsampleFieldSection = ({ form, phaseName, dataTestSubj }: DownsampleFieldSectionProps) => {
  const enabledPath = `_meta.${phaseName}.downsampleEnabled`;
  useFormData({ form, watch: enabledPath });

  const enabledField = form.getFields()[enabledPath];
  if (!enabledField) return null;
  const isEnabled = Boolean(enabledField.value);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="m">
                <h5>
                  {i18n.translate('xpack.streams.editIlmPhasesFlyout.downsamplingTitle', {
                    defaultMessage: 'Downsampling',
                  })}
                </h5>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={i18n.translate('xpack.streams.editIlmPhasesFlyout.downsamplingHelp', {
                  defaultMessage: 'Configure downsampling for this phase.',
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiSwitch
            label=""
            showLabel={false}
            compressed
            checked={isEnabled}
            data-test-subj={`${dataTestSubj}DownsamplingSwitch`}
            onChange={(e) => enabledField.setValue(e.target.checked)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <div hidden={!isEnabled} aria-hidden={!isEnabled}>
        <DownsampleIntervalField
          phaseName={phaseName}
          dataTestSubj={dataTestSubj}
          timeUnitOptions={TIME_UNIT_OPTIONS}
          isEnabled={isEnabled}
        />
      </div>
    </EuiFlexGroup>
  );
};

interface SearchableSnapshotFieldSectionProps {
  form: FormHook<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>;
  phaseName: 'cold' | 'frozen';
  dataTestSubj: string;
  searchableSnapshotRepositories: string[];
  isLoadingSearchableSnapshotRepositories?: boolean;
  onRefreshSearchableSnapshotRepositories?: () => void;
  onCreateSnapshotRepository?: () => void;
}

const SearchableSnapshotFieldSection = ({
  form,
  phaseName,
  dataTestSubj,
  searchableSnapshotRepositories,
  isLoadingSearchableSnapshotRepositories,
  onRefreshSearchableSnapshotRepositories,
  onCreateSnapshotRepository,
}: SearchableSnapshotFieldSectionProps) => {
  const repositoryPath = `_meta.searchableSnapshot.repository`;
  const isFrozenPhase = phaseName === 'frozen';
  const enabledPath = `_meta.cold.searchableSnapshotEnabled`;
  useFormData({ form, watch: isFrozenPhase ? [repositoryPath] : [enabledPath, repositoryPath] });

  const enabledField = isFrozenPhase ? undefined : form.getFields()[enabledPath];
  const repositoryField = form.getFields()[repositoryPath];

  // Frozen phase always requires searchable snapshots.
  const isEnabled = isFrozenPhase ? true : Boolean(enabledField?.value);

  const repositoryOptions = [
    ...searchableSnapshotRepositories.map((repo) => ({ value: repo, text: repo })),
  ];

  if (!repositoryField || (!isFrozenPhase && !enabledField)) return null;

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="m">
                <h5>
                  {i18n.translate('xpack.streams.editIlmPhasesFlyout.searchableSnapshotTitle', {
                    defaultMessage: 'Searchable snapshot',
                  })}
                </h5>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={i18n.translate(
                  'xpack.streams.editIlmPhasesFlyout.searchableSnapshotHelp',
                  {
                    defaultMessage: 'Configure searchable snapshots for this phase.',
                  }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {!isFrozenPhase && (
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label=""
              showLabel={false}
              compressed
              checked={isEnabled}
              data-test-subj={`${dataTestSubj}SearchableSnapshotSwitch`}
              onChange={(e) => {
                const enabled = e.target.checked;
                enabledField!.setValue(enabled);
              }}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {isEnabled && (
        <SearchableSnapshotRepositoryField
          form={form}
          repositoryOptions={repositoryOptions}
          isLoadingSearchableSnapshotRepositories={isLoadingSearchableSnapshotRepositories}
          onRefreshSearchableSnapshotRepositories={onRefreshSearchableSnapshotRepositories}
          onCreateSnapshotRepository={onCreateSnapshotRepository}
          dataTestSubj={dataTestSubj}
        />
      )}
    </EuiFlexGroup>
  );
};

interface RemovePhaseButtonProps {
  form: FormHook<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>;
  phaseName: PhaseName | undefined;
  enabledPhases: PhaseName[];
  dataTestSubj: string;
  setSelectedIlmPhase: React.Dispatch<React.SetStateAction<PhaseName | undefined>>;
}

const RemovePhaseButton = ({
  form,
  phaseName,
  enabledPhases,
  dataTestSubj,
  setSelectedIlmPhase,
}: RemovePhaseButtonProps) => {
  if (!phaseName) return null;
  if (phaseName === 'hot') return null;

  const enabledPath = `_meta.${phaseName}.enabled`;
  const enabledField = form.getFields()[enabledPath];
  if (!enabledField) return null;

  const hotEnabled = enabledPhases.includes('hot');
  const nonDeleteEnabledPhases = enabledPhases.filter((p) => p !== 'delete');
  const isOnlyDeletePhaseEnabled = enabledPhases.length === 1 && enabledPhases[0] === 'delete';
  const isLastNonDeletePhaseWithoutHot =
    !hotEnabled && phaseName !== 'delete' && nonDeleteEnabledPhases.length === 1;

  const isRemoveDisabled =
    (phaseName === 'delete' && isOnlyDeletePhaseEnabled) || isLastNonDeletePhaseWithoutHot;

  return (
    <EuiButton
      color="danger"
      size="s"
      data-test-subj={`${dataTestSubj}RemoveItemButton`}
      disabled={isRemoveDisabled}
      onClick={() => {
        enabledField.setValue(false);
        const remaining = enabledPhases.filter((p) => p !== phaseName);
        setSelectedIlmPhase(remaining[0]);
      }}
    >
      {i18n.translate('xpack.streams.editIlmPhasesFlyout.removePhase', {
        defaultMessage: 'Remove {phase} phase',
        values: { phase: phaseName },
      })}
    </EuiButton>
  );
};

interface PhasePanelProps {
  phase: PhaseName;
  selectedPhase: PhaseName | undefined;
  enabledPhases: PhaseName[];
  setSelectedIlmPhase: React.Dispatch<React.SetStateAction<PhaseName | undefined>>;
  form: FormHook<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>;
  dataTestSubj: string;
  sectionStyles: ReturnType<typeof useStyles>['sectionStyles'];
  searchableSnapshotRepositories: string[];
  isLoadingSearchableSnapshotRepositories?: boolean;
  onRefreshSearchableSnapshotRepositories?: () => void;
  onCreateSnapshotRepository?: () => void;
}

const PhasePanel = ({
  phase,
  selectedPhase,
  enabledPhases,
  setSelectedIlmPhase,
  form,
  dataTestSubj,
  sectionStyles,
  searchableSnapshotRepositories,
  isLoadingSearchableSnapshotRepositories,
  onRefreshSearchableSnapshotRepositories,
  onCreateSnapshotRepository,
}: PhasePanelProps) => {
  const isHidden = selectedPhase !== phase;

  const isHotPhase = phase === 'hot';
  const isWarmPhase = phase === 'warm';
  const isColdPhase = phase === 'cold';
  const isFrozenPhase = phase === 'frozen';
  const isDeletePhase = phase === 'delete';

  return (
    <div hidden={isHidden} aria-hidden={isHidden}>
      <PhaseFieldsMount phase={phase} />

      <EuiFlexGroup
        direction="column"
        gutterSize="m"
        responsive={false}
        css={sectionStyles}
        data-test-subj={`${dataTestSubj}Panel-${phase}`}
      >
        {!isHotPhase && (
          <EuiFlexItem grow={false}>
            <MinAgeField
              phaseName={phase}
              dataTestSubj={dataTestSubj}
              timeUnitOptions={TIME_UNIT_OPTIONS}
            />
          </EuiFlexItem>
        )}

        {(isHotPhase || isWarmPhase || isColdPhase) && (
          <EuiFlexItem grow={false}>
            <ReadOnlyToggleField
              form={form}
              phaseName={phase}
              dataTestSubj={dataTestSubj}
              allowedPhases={READONLY_ALLOWED_PHASES}
            />
          </EuiFlexItem>
        )}

        {isDeletePhase && (
          <EuiFlexItem grow={false}>
            <DeleteSearchableSnapshotToggleField
              form={form}
              phaseName={phase}
              dataTestSubj={dataTestSubj}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {(isHotPhase || isWarmPhase || isColdPhase) && (
        <>
          <EuiHorizontalRule margin="none" />
          <div css={sectionStyles}>
            <DownsampleFieldSection form={form} phaseName={phase} dataTestSubj={dataTestSubj} />
          </div>
        </>
      )}

      {(isColdPhase || isFrozenPhase) && (
        <>
          <EuiHorizontalRule margin="none" />
          <div css={sectionStyles}>
            <SearchableSnapshotFieldSection
              form={form}
              phaseName={phase}
              dataTestSubj={dataTestSubj}
              searchableSnapshotRepositories={searchableSnapshotRepositories}
              isLoadingSearchableSnapshotRepositories={isLoadingSearchableSnapshotRepositories}
              onRefreshSearchableSnapshotRepositories={onRefreshSearchableSnapshotRepositories}
              onCreateSnapshotRepository={onCreateSnapshotRepository}
            />
          </div>
        </>
      )}

      {!isHotPhase && (
        <>
          <EuiHorizontalRule margin="none" />
          <div css={sectionStyles}>
            <RemovePhaseButton
              form={form}
              phaseName={phase}
              enabledPhases={enabledPhases}
              dataTestSubj={dataTestSubj}
              setSelectedIlmPhase={setSelectedIlmPhase}
            />
          </div>
        </>
      )}
    </div>
  );
};

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const sectionStyles = css`
      padding: ${euiTheme.size.l};
    `;

    const headerStyles = css`
      padding: ${euiTheme.size.l} ${euiTheme.size.l} 0 ${euiTheme.size.l};
    `;

    const footerStyles = css`
      padding: ${euiTheme.size.m} ${euiTheme.size.l};
    `;

    return { sectionStyles, headerStyles, footerStyles };
  }, [euiTheme.size.l, euiTheme.size.m]);
};

export const EditIlmPhasesFlyout = ({
  initialPhases,
  initialSelectedPhase,
  phaseToEnableOnOpen,
  onSelectedPhaseChange,
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

  const [errorsByPath, setErrorsByPath] = useState<Record<string, string[] | null>>({});
  const onFieldErrorsChange = useCallback<OnFieldErrorsChange>((path, errors) => {
    setErrorsByPath((prev) => {
      if (isEqual(prev[path], errors)) return prev;
      return { ...prev, [path]: errors };
    });
  }, []);

  const tabHasErrors = useCallback(
    (phaseName: PhaseName) => {
      const hasErrorAt = (path: string) => Boolean(errorsByPath[path]?.length);

      // Min age validations live on the value field for warm/cold/frozen/delete.
      if (phaseName !== 'hot' && hasErrorAt(`_meta.${phaseName}.minAgeValue`)) return true;

      // Downsample validations live on the fixedIntervalValue field.
      const downsampleEnabled = Boolean((formData as any)?._meta?.[phaseName]?.downsampleEnabled);
      if (
        (phaseName === 'hot' || phaseName === 'warm' || phaseName === 'cold') &&
        downsampleEnabled &&
        hasErrorAt(`_meta.${phaseName}.downsample.fixedIntervalValue`)
      ) {
        return true;
      }

      // Searchable snapshot repository is a shared field, but should surface per-phase.
      const repositoryHasError = hasErrorAt('_meta.searchableSnapshot.repository');
      if (repositoryHasError) {
        const coldSnapshotEnabled = Boolean(
          (formData as any)?._meta?.cold?.searchableSnapshotEnabled
        );
        if (phaseName === 'cold' && coldSnapshotEnabled) return true;
        if (phaseName === 'frozen') return true; // Frozen always requires searchable snapshots.
      }

      return false;
    },
    [errorsByPath, formData]
  );

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

  const [selectedIlmPhase, setSelectedIlmPhase] = useState<PhaseName | undefined>(
    initialSelectedPhase
  );
  const pendingSelectedIlmPhaseRef = useRef<PhaseName | null>(phaseToEnableOnOpen ?? null);
  const didAutoEnablePhaseRef = useRef(false);

  useEffect(() => {
    if (
      !phaseToEnableOnOpen ||
      didAutoEnablePhaseRef.current ||
      enabledPhases.includes(phaseToEnableOnOpen)
    )
      return;
    didAutoEnablePhaseRef.current = true;

    const getDefaultMinAge = (): { value: string; unit: TimeUnit } => {
      const candidates: Array<'warm' | 'cold' | 'frozen' | 'delete'> = [
        'warm',
        'cold',
        'frozen',
        'delete',
      ];
      let last: { value: string; unit: TimeUnit } | undefined;
      candidates.forEach((p) => {
        const enabled = Boolean(form.getFields()[`_meta.${p}.enabled`]?.value);
        if (!enabled) return;
        const value = String(form.getFields()[`_meta.${p}.minAgeValue`]?.value ?? '').trim();
        const unit = (form.getFields()[`_meta.${p}.minAgeUnit`]?.value ?? 'd') as TimeUnit;
        if (value) last = { value, unit };
      });
      return last ?? DEFAULT_NEW_PHASE_MIN_AGE;
    };

    setTimeout(() => {
      form.setFieldValue(`_meta.${phaseToEnableOnOpen}.enabled`, true);
      if (phaseToEnableOnOpen !== 'hot') {
        const valuePath = `_meta.${phaseToEnableOnOpen}.minAgeValue`;
        const unitPath = `_meta.${phaseToEnableOnOpen}.minAgeUnit`;
        const millisPath = `_meta.${phaseToEnableOnOpen}.minAgeToMilliSeconds`;
        const valueField = form.getFields()[valuePath];
        const unitField = form.getFields()[unitPath];
        if (valueField && String(valueField.value ?? '').trim() === '') {
          const { value: defaultValue, unit: defaultUnit } = getDefaultMinAge();
          valueField.setValue(defaultValue);
          unitField?.setValue(defaultUnit);
        }
        const resolvedValue = String(form.getFields()[valuePath]?.value ?? '');
        const resolvedUnit = String(form.getFields()[unitPath]?.value ?? 'd') as TimeUnit;
        const millis =
          resolvedValue.trim() === '' ? -1 : toMilliseconds(resolvedValue, resolvedUnit);
        form.setFieldValue(millisPath, millis);
      }
      setSelectedIlmPhase(phaseToEnableOnOpen);
    }, 0);
  }, [phaseToEnableOnOpen, enabledPhases, form]);

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
      const preferred =
        initialSelectedPhase && enabledPhases.includes(initialSelectedPhase)
          ? initialSelectedPhase
          : enabledPhases[0];
      setSelectedIlmPhase(preferred);
      return;
    }

    if (!enabledPhases.includes(selectedIlmPhase)) {
      if (pendingSelectedIlmPhaseRef.current === selectedIlmPhase) {
        return;
      }
      setSelectedIlmPhase(enabledPhases[0]);
    }
  }, [enabledPhases, selectedIlmPhase, initialSelectedPhase]);

  useEffect(() => {
    onSelectedPhaseChange?.(selectedIlmPhase);
  }, [onSelectedPhaseChange, selectedIlmPhase]);

  const tabs = useMemo(() => {
    return enabledPhases.map((phaseName) => (
      <EuiTab
        key={phaseName}
        onClick={() => setSelectedIlmPhase(phaseName)}
        isSelected={phaseName === selectedIlmPhase}
        data-test-subj={`${dataTestSubj}Tab-${phaseName}`}
        prepend={
          tabHasErrors(phaseName) ? <EuiIcon type="warning" color="danger" size="m" /> : undefined
        }
      >
        {tabHasErrors(phaseName) ? (
          <EuiTextColor color="danger">{PHASE_LABELS[phaseName]}</EuiTextColor>
        ) : (
          PHASE_LABELS[phaseName]
        )}
      </EuiTab>
    ));
  }, [enabledPhases, selectedIlmPhase, dataTestSubj, tabHasErrors]);

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
            <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiTabs bottomBorder={false}>{tabs}</EuiTabs>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <IlmPhaseSelect
                  selectedPhases={enabledPhases}
                  onSelect={(phase) => {
                    if (enabledPhases.includes(phase)) {
                      pendingSelectedIlmPhaseRef.current = null;
                      setSelectedIlmPhase(phase);
                      return;
                    }

                    const getDefaultMinAge = (): { value: string; unit: TimeUnit } => {
                      const candidates: Array<'warm' | 'cold' | 'frozen' | 'delete'> = [
                        'warm',
                        'cold',
                        'frozen',
                        'delete',
                      ];
                      let last: { value: string; unit: TimeUnit } | undefined;
                      candidates.forEach((p) => {
                        const enabled = Boolean(form.getFields()[`_meta.${p}.enabled`]?.value);
                        if (!enabled) return;

                        const value = String(
                          form.getFields()[`_meta.${p}.minAgeValue`]?.value ?? ''
                        ).trim();
                        const unit = (form.getFields()[`_meta.${p}.minAgeUnit`]?.value ??
                          'd') as TimeUnit;
                        if (value) {
                          last = { value, unit };
                        }
                      });
                      return last ?? DEFAULT_NEW_PHASE_MIN_AGE;
                    };

                    pendingSelectedIlmPhaseRef.current = phase;
                    form.setFieldValue(`_meta.${phase}.enabled`, true);

                    if (phase !== 'hot') {
                      const valuePath = `_meta.${phase}.minAgeValue`;
                      const unitPath = `_meta.${phase}.minAgeUnit`;
                      const millisPath = `_meta.${phase}.minAgeToMilliSeconds`;

                      const valueField = form.getFields()[valuePath];
                      const unitField = form.getFields()[unitPath];

                      // When enabling a previously-disabled phase, preserve existing values.
                      // Otherwise default to the last configured min_age (or 30d).
                      if (valueField && String(valueField.value ?? '').trim() === '') {
                        const { value: defaultValue, unit: defaultUnit } = getDefaultMinAge();
                        valueField.setValue(defaultValue);
                        unitField?.setValue(defaultUnit);
                      }

                      const resolvedValue = String(form.getFields()[valuePath]?.value ?? '');
                      const resolvedUnit = String(
                        form.getFields()[unitPath]?.value ?? 'd'
                      ) as TimeUnit;
                      const millis =
                        resolvedValue.trim() === ''
                          ? -1
                          : toMilliseconds(resolvedValue, resolvedUnit);
                      form.setFieldValue(millisPath, millis);

                      // Frozen phase always requires searchable snapshots (no toggle).
                    }

                    setSelectedIlmPhase(phase);
                  }}
                  renderButton={(buttonProps) => {
                    const button = (
                      <EuiButtonIcon
                        {...buttonProps}
                        display="empty"
                        iconType="plus"
                        aria-label={i18n.translate(
                          'xpack.streams.editIlmPhasesFlyout.addPhaseAriaLabel',
                          { defaultMessage: 'Add data phase' }
                        )}
                        size="xs"
                        color="primary"
                        data-test-subj={`${dataTestSubj}AddTabButton`}
                      />
                    );

                    if (!buttonProps.disabled) {
                      return button;
                    }

                    return (
                      <EuiToolTip
                        position="top"
                        content={i18n.translate(
                          'xpack.streams.editIlmPhasesFlyout.allPhasesInUseTooltip',
                          { defaultMessage: 'All data phases are in use' }
                        )}
                      >
                        <span tabIndex={0}>{button}</span>
                      </EuiToolTip>
                    );
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
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
