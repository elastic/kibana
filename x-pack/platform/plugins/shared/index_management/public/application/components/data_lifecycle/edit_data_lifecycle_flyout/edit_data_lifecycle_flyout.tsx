/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  EditDataLifecycleFlyoutBody,
  EditFailedDataLifecycleFlyoutBody,
  FlyoutWithTabs,
  type DataLifecycleMethod,
  type IlmPolicyForFlyout,
  type NonEmptyFlyoutTabs,
  buildDataLifecycleApplyPayload,
  buildFailedDataLifecycleApplyPayload,
  type DataLifecycleApplyPayload,
  type FailedDataLifecycleApplyPayload,
} from '@kbn/data-lifecycle-phases';
import { DlmPhasesSelector, DeletePhaseCard } from '../dlm_phases_selector';
import type {
  DlmPhasesSelectorProps,
  DlmPhaseDuration,
  SerializedDlmPhases,
} from '../dlm_phases_selector';
import { editDataLifecycleFlyoutStrings as strings } from './strings';

type TabId = 'successful_data' | 'failed_data';

const TABS: NonEmptyFlyoutTabs<TabId> = [
  { id: 'successful_data', label: strings.successfulDataTabLabel },
  { id: 'failed_data', label: strings.failedDataTabLabel },
];

export interface EditDataLifecycleFlyoutOnApplyArgs {
  successfulData: DataLifecycleApplyPayload | undefined;
  failedData: FailedDataLifecycleApplyPayload;
}

export interface EditDataLifecycleFlyoutProps {
  onClose: () => void;
  onApply: (args: EditDataLifecycleFlyoutOnApplyArgs) => void;
  initialTabId?: TabId;
  /**
   * When true, only the Delete phase is shown in the DLM phase selector.
   * The Frozen phase and Hot phase are hidden (Serverless deployments).
   */
  isServerless?: boolean;

  // ---- Successful data ----
  successfulData: {
    inheritLifecycle: boolean;
    onInheritLifecycleChange?: (next: boolean) => void;
    indexTemplateHref?: string;
    /**
     * DLM phase selector configuration.
     * `isDisabled`, `serverless`, and `onChange` are controlled internally —
     * use `onApply` to receive the final durations.
     */
    dlm?: Omit<DlmPhasesSelectorProps, 'isDisabled' | 'serverless' | 'onChange'>;
    /**
     * When provided, shows the lifecycle method picker (DLM vs ILM) and the ILM policy selector.
     * Omit on Serverless or when only DLM is available.
     */
    ilm?: {
      method: DataLifecycleMethod;
      onMethodChange: (next: DataLifecycleMethod) => void;
      policies: IlmPolicyForFlyout[];
      selectedPolicyName?: string;
      onPolicySelect: (name: string) => void;
      onPolicyInspect?: (name: string) => void;
    };
  };

  // ---- Failed data ----
  failedData: {
    inheritLifecycle: boolean;
    onInheritLifecycleChange?: (next: boolean) => void;
    indexTemplateHref?: string;
    failureStoreEnabled: boolean;
    onFailureStoreChange: (next: boolean) => void;
   deletePhaseDefaultValue?: DlmPhaseDuration;
  };
}

/**
 * Combined "Edit data lifecycle" flyout for Index Management.
 *
 * - **Successful data tab**: `EditDataLifecycleFlyoutBody` + `DlmPhasesSelector`
 * - **Failed data tab**: `EditFailedDataLifecycleFlyoutBody` + `DeletePhaseCard`
 */
export const EditDataLifecycleFlyout = ({
  onClose,
  onApply,
  initialTabId,
  isServerless = false,
  successfulData,
  failedData,
}: EditDataLifecycleFlyoutProps) => {
  const { euiTheme } = useEuiTheme();
  const failedDeletePhaseCardId = useGeneratedHtmlId({
    prefix: 'editDataLifecycle-failedDeletePhase',
  });

  const { ilm } = successfulData;
  const effectiveMethod = ilm?.method ?? 'dlm';

  const [isDlmValid, setIsDlmValid] = useState(true);
  const dlmSerializedRef = useRef<SerializedDlmPhases>({});
  const [failedDeletePhase, setFailedDeletePhase] = useState<DlmPhaseDuration>(
    () => failedData.deletePhaseDefaultValue ?? { enabled: false, value: '60', unit: 'd' }
  );

  const handleApply = () => {
    const { frozen_after: frozenAfter, data_retention: dataRetention } = dlmSerializedRef.current;
    const successfulPayload = buildDataLifecycleApplyPayload({
      inheritLifecycle: successfulData.inheritLifecycle,
      method: effectiveMethod,
      ilmPolicyName: ilm?.selectedPolicyName,
      frozenAfter,
      dataRetention,
    });

    const { enabled, value, unit } = failedDeletePhase;
    const failedPayload = buildFailedDataLifecycleApplyPayload({
      inheritLifecycle: failedData.inheritLifecycle,
      failureStoreEnabled: failedData.failureStoreEnabled,
      retention: enabled ? `${value}${unit}` : undefined,
    });

    onApply({ successfulData: successfulPayload, failedData: failedPayload });
  };

  const isApplyDisabled =
    (!successfulData.inheritLifecycle && effectiveMethod === 'ilm' && !ilm?.selectedPolicyName) ||
    (!successfulData.inheritLifecycle && effectiveMethod === 'dlm' && !isDlmValid);

  const footerStyles = useMemo(
    () => css`
      padding: ${euiTheme.size.m} ${euiTheme.size.l};
    `,
    [euiTheme.size.m, euiTheme.size.l]
  );

  const footer = (
    <EuiFlyoutFooter>
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="s"
        responsive={false}
        css={footerStyles}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onClose} flush="left">
            {strings.cancelButton}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={handleApply}
            disabled={isApplyDisabled}
            data-test-subj="editDataLifecycleFlyoutApplyButton"
          >
            {strings.applyButton}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );

  const dlmContent =
    successfulData.dlm != null && effectiveMethod === 'dlm' ? (
      <>
        <EuiTitle size="xxs">
          <h3>{strings.dataPhasesTitle}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <DlmPhasesSelector
          {...successfulData.dlm}
          isDisabled={successfulData.inheritLifecycle}
          serverless={isServerless}
          onChange={(value, serialized, isValid) => {
            dlmSerializedRef.current = serialized;
            setIsDlmValid(isValid);
          }}
        />
      </>
    ) : undefined;

  const failedDeletePhaseContent = (
    <>
      <EuiTitle size="xxs">
        <h3>{strings.dataPhasesTitle}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <DeletePhaseCard
        id={failedDeletePhaseCardId}
        duration={failedDeletePhase}
        isCardDisabled={failedData.inheritLifecycle}
        isFormDisabled={failedData.inheritLifecycle}
        onChange={setFailedDeletePhase}
      />
    </>
  );

  const inheritLink =
    successfulData.indexTemplateHref !== undefined
      ? { href: successfulData.indexTemplateHref, label: strings.viewIndexTemplateLabel }
      : undefined;

  const failedInheritLink =
    failedData.indexTemplateHref !== undefined
      ? { href: failedData.indexTemplateHref, label: strings.viewIndexTemplateLabel }
      : undefined;

  return (
    <FlyoutWithTabs
      title={strings.title}
      tabsAriaLabel={strings.tabsAriaLabel}
      tabs={TABS}
      initialTabId={initialTabId}
      onClose={onClose}
      size={400}
      type="overlay"
    >
      {(selectedTabId) => (
        <>
          {selectedTabId === 'successful_data' && (
            <EditDataLifecycleFlyoutBody
              inherit={
                inheritLink !== undefined || successfulData.onInheritLifecycleChange !== undefined
                  ? {
                      value: successfulData.inheritLifecycle,
                      onChange: successfulData.onInheritLifecycleChange ?? (() => {}),
                      label: strings.inheritLabel,
                      link: inheritLink,
                    }
                  : undefined
              }
              method={ilm ? { value: ilm.method, onChange: ilm.onMethodChange } : undefined}
              ilm={
                ilm
                  ? {
                      policies: ilm.policies,
                      selectedPolicyName: ilm.selectedPolicyName,
                      onSelect: ilm.onPolicySelect,
                      onInspect: ilm.onPolicyInspect,
                    }
                  : undefined
              }
              dataStreamLifecycleContent={dlmContent}
            />
          )}
          {selectedTabId === 'failed_data' && (
            <EditFailedDataLifecycleFlyoutBody
              inherit={
                failedInheritLink !== undefined || failedData.onInheritLifecycleChange !== undefined
                  ? {
                      value: failedData.inheritLifecycle,
                      onChange: failedData.onInheritLifecycleChange ?? (() => {}),
                      label: strings.inheritLabel,
                      link: failedInheritLink,
                    }
                  : undefined
              }
              failureStore={{
                value: failedData.failureStoreEnabled,
                onChange: failedData.onFailureStoreChange,
              }}
              retentionContent={failedDeletePhaseContent}
            />
          )}
          {footer}
        </>
      )}
    </FlyoutWithTabs>
  );
};
