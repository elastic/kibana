/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, useGeneratedHtmlId } from '@elastic/eui';
import {
  DefaultSnapshotRepositoryRequiredModal,
  EnterpriseGatingModal,
  usePhaseColors,
} from '@kbn/data-lifecycle-phases';
import {
  getDurationLabel,
  mergeDefaultValue,
  serializeDlmPhases,
  validateDurations,
} from './utils/duration_utils';
import { DeletePhaseCard } from './components/delete_phase_card';
import { FrozenPhaseCard } from './components/frozen_phase_card';
import { HotPhaseCard } from './components/hot_phase_card';
import { dlmPhasesSelectorStrings as strings } from './strings';
import type { DlmPhaseDuration, DlmPhasesSelectorProps, DlmPhasesSelectorValue } from './types';
import type { FrozenDisabledReason } from './components/frozen_phase_card';

export type {
  DlmPhaseDuration,
  DlmPhasesSelectorEnterpriseConfig,
  DlmPhasesSelectorProps,
  DlmPhasesSelectorValue,
  SerializedDlmPhases,
} from './types';

export const DlmPhasesSelector = ({
  defaultValue,
  hasEnterpriseLicense,
  hasDefaultSnapshotRepository,
  isDisabled = false,
  defaultSnapshotRepository,
  serverless = false,
  manageRepositoriesUrl,
  createDefaultRepositoryUrl,
  canCreateDefaultSnapshotRepository,
  enterprise,
  onRefreshDefaultSnapshotRepository,
  onChange,
}: DlmPhasesSelectorProps) => {
  const hotCheckboxId = useGeneratedHtmlId({ prefix: 'dlmHotPhase' });
  const frozenCheckboxId = useGeneratedHtmlId({ prefix: 'dlmFrozenPhase' });
  const deleteCheckboxId = useGeneratedHtmlId({ prefix: 'dlmDeletePhase' });
  const phaseColors = usePhaseColors();

  const [value, setValue] = useState<DlmPhasesSelectorValue>(() => mergeDefaultValue(defaultValue));
  const [openModal, setOpenModal] = useState<'enterprise' | 'defaultRepository' | undefined>();
  const [isRefreshingDefaultSnapshotRepository, setIsRefreshingDefaultSnapshotRepository] =
    useState(false);

  const closeModal = useCallback(() => {
    setOpenModal(undefined);
  }, []);

  useEffect(() => {
    if (hasDefaultSnapshotRepository && openModal === 'defaultRepository') {
      closeModal();
    }
  }, [closeModal, hasDefaultSnapshotRepository, openModal]);

  const refreshDefaultSnapshotRepository = useCallback(async () => {
    if (!onRefreshDefaultSnapshotRepository) {
      return;
    }

    setIsRefreshingDefaultSnapshotRepository(true);

    try {
      await onRefreshDefaultSnapshotRepository();
    } finally {
      setIsRefreshingDefaultSnapshotRepository(false);
    }
  }, [onRefreshDefaultSnapshotRepository]);

  const frozenDisabledReason: FrozenDisabledReason | undefined = !hasEnterpriseLicense
    ? { type: 'enterprise', onClick: () => setOpenModal('enterprise') }
    : !hasDefaultSnapshotRepository
    ? { type: 'defaultRepository', onClick: () => setOpenModal('defaultRepository') }
    : undefined;

  const shouldShowFrozenPhase =
    !serverless && (hasDefaultSnapshotRepository || canCreateDefaultSnapshotRepository);
  const frozenDisabled = isDisabled || Boolean(frozenDisabledReason);
  const validation = validateDurations(value);

  const updateValue = useCallback(
    (nextValue: DlmPhasesSelectorValue) => {
      setValue(nextValue);
      const nextValidation = validateDurations(nextValue);
      onChange?.(nextValue, serializeDlmPhases(nextValue), nextValidation.isValid);
    },
    [onChange]
  );

  const updateFrozen = useCallback(
    (nextFrozen: DlmPhaseDuration) => {
      updateValue({ ...value, frozen: nextFrozen });
    },
    [updateValue, value]
  );

  const updateDelete = useCallback(
    (nextDelete: DlmPhaseDuration) => {
      updateValue({ ...value, delete: nextDelete });
    },
    [updateValue, value]
  );

  const frozenHelpText =
    value.frozen.enabled && value.delete.enabled
      ? strings.frozenMustOccurBeforeDeleteHelpText(getDurationLabel(value.delete))
      : undefined;

  const deleteHelpText =
    value.frozen.enabled && value.delete.enabled
      ? strings.deleteMustOccurAfterFrozenHelpText(getDurationLabel(value.frozen))
      : undefined;

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        {!serverless && (
          <EuiFlexItem grow={false}>
            <HotPhaseCard id={hotCheckboxId} color={phaseColors.hot} />
          </EuiFlexItem>
        )}

        {shouldShowFrozenPhase && (
          <EuiFlexItem grow={false}>
            <FrozenPhaseCard
              id={frozenCheckboxId}
              color={phaseColors.frozen}
              duration={value.frozen}
              disabled={frozenDisabled}
              disabledReason={frozenDisabledReason}
              durationError={validation.frozenError}
              helpText={frozenHelpText}
              isFormDisabled={isDisabled}
              defaultSnapshotRepository={defaultSnapshotRepository}
              manageRepositoriesHref={manageRepositoriesUrl}
              onChange={updateFrozen}
            />
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={false}>
          <DeletePhaseCard
            id={deleteCheckboxId}
            duration={value.delete}
            isCardDisabled={isDisabled}
            durationError={validation.deleteError}
            helpText={deleteHelpText}
            isFormDisabled={isDisabled}
            onChange={updateDelete}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {openModal === 'enterprise' && (
        <EnterpriseGatingModal
          environment={enterprise.isCloudEnabled ? 'cloud' : 'selfManaged'}
          hasManageSubscriptionPermission={
            enterprise.isCloudEnabled ? true : enterprise.canManageLicense
          }
          trialStatus={enterprise.trialDaysLeft !== undefined ? 'expired' : 'notStarted'}
          subscriptionFeaturesUrl={enterprise.subscriptionFeaturesUrl}
          onPrimaryAction={enterprise.onUpgrade}
          onCancel={closeModal}
        />
      )}

      {openModal === 'defaultRepository' && (
        <DefaultSnapshotRepositoryRequiredModal
          createDefaultRepositoryUrl={createDefaultRepositoryUrl}
          isRefreshing={isRefreshingDefaultSnapshotRepository}
          onCancel={closeModal}
          onRefresh={refreshDefaultSnapshotRepository}
        />
      )}
    </>
  );
};
