/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  CASE_STATUS_CATEGORIES,
  CASE_STATUS_CATEGORY_LABELS,
  MAX_CASE_STATUSES_PER_CATEGORY,
} from '../../../../common/investigations/statuses';
import type {
  CaseStatusConfiguration,
  StatusesConfiguration,
} from '../../../../common/investigations/statuses';
import type { InvestigationStatus } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { StatusFlyout } from './status_flyout';
import { StatusRow } from './status_row';
import {
  generateStatusKey,
  getCategoryStatuses,
  hasPausingStatus,
  moveStatus,
  reindex,
  setDefaultStatus,
  sortByOrder,
  withSeededPauseReasons,
} from './status_utils';
import type { MoveDirection, StatusesDraft } from './status_utils';
import type { SaveStatusesResult } from './use_statuses_editor';
import * as i18n from './translations';

export interface StatusesSectionProps {
  config: StatusesConfiguration;
  isReadOnly: boolean;
  isSaving: boolean;
  save: (draft: StatusesDraft) => Promise<SaveStatusesResult>;
  onReload: () => void;
}

interface FlyoutState {
  category: InvestigationStatus;
  status?: CaseStatusConfiguration;
}

interface CategoryBlockProps extends Pick<StatusesSectionProps, 'isReadOnly'> {
  category: InvestigationStatus;
  statuses: CaseStatusConfiguration[];
  /** Under In progress: offers the On hold status when nothing pauses time tracking. */
  showOnHoldCallout: boolean;
  onAdd: (category: InvestigationStatus) => void;
  onAddOnHold: () => void;
  onEdit: (status: CaseStatusConfiguration) => void;
  onSetDefault: (status: CaseStatusConfiguration) => void;
  onMove: (status: CaseStatusConfiguration, direction: MoveDirection) => void;
  onToggleDisabled: (status: CaseStatusConfiguration) => void;
}

const CategoryBlock: React.FC<CategoryBlockProps> = ({
  category,
  statuses,
  isReadOnly,
  showOnHoldCallout,
  onAdd,
  onAddOnHold,
  onEdit,
  onSetDefault,
  onMove,
  onToggleDisabled,
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationDisabledStatuses' });
  const label = CASE_STATUS_CATEGORY_LABELS[category];
  const inCategory = getCategoryStatuses(statuses, category);
  const enabled = inCategory.filter((status) => !status.disabled);
  const disabled = inCategory.filter((status) => status.disabled);
  const isAtLimit = inCategory.length >= MAX_CASE_STATUSES_PER_CATEGORY;

  const renderRow = (status: CaseStatusConfiguration) => {
    const index = enabled.findIndex(({ key }) => key === status.key);
    return (
      <StatusRow
        key={status.key}
        status={status}
        canEdit={!isReadOnly}
        canMoveUp={!status.disabled && index > 0}
        canMoveDown={!status.disabled && index >= 0 && index < enabled.length - 1}
        isOnlyEnabled={enabled.length <= 1}
        onEdit={onEdit}
        onSetDefault={onSetDefault}
        onMove={onMove}
        onToggleDisabled={onToggleDisabled}
      />
    );
  };

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj={`investigationStatusCategory-${category}`}>
      <EuiFlexGroup alignItems="baseline" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{label}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.ENABLED_COUNT(enabled.length)}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="s" color="subdued">
        <p>{i18n.CATEGORY_HELP[category]}</p>
      </EuiText>
      <EuiSpacer size="s" />
      {enabled.length > 0 ? (
        enabled.map(renderRow)
      ) : (
        <EuiText size="s" color="subdued">
          {i18n.NO_ENABLED_STATUSES}
        </EuiText>
      )}
      {disabled.length > 0 ? (
        <>
          <EuiSpacer size="s" />
          <EuiAccordion
            id={accordionId}
            buttonContent={i18n.DISABLED_STATUSES(disabled.length)}
            data-test-subj={`investigationDisabledStatuses-${category}`}
          >
            <EuiSpacer size="xs" />
            {disabled.map(renderRow)}
          </EuiAccordion>
        </>
      ) : null}
      {showOnHoldCallout && !isReadOnly ? (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            announceOnMount
            size="s"
            title={i18n.ON_HOLD_TITLE}
            data-test-subj="investigationOnHoldCallout"
          >
            <p>{i18n.ON_HOLD_BODY}</p>
            <EuiButton size="s" onClick={onAddOnHold} data-test-subj="investigationAddOnHold">
              {i18n.ADD_ON_HOLD}
            </EuiButton>
          </EuiCallOut>
        </>
      ) : null}
      {isReadOnly ? null : (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup justifyContent="center" responsive={false}>
            <EuiFlexItem grow={false}>
              {isAtLimit ? (
                <EuiText
                  size="xs"
                  color="subdued"
                  data-test-subj={`investigationStatusLimit-${category}`}
                >
                  {i18n.STATUS_LIMIT(MAX_CASE_STATUSES_PER_CATEGORY, label)}
                </EuiText>
              ) : (
                <EuiButtonEmpty
                  size="s"
                  iconType={ICONS.add}
                  onClick={() => onAdd(category)}
                  data-test-subj={`investigationAddStatus-${category}`}
                >
                  {i18n.ADD_STATUS}
                </EuiButtonEmpty>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
};
CategoryBlock.displayName = 'CategoryBlock';

/** The Statuses section: one block per category, saved to the server on every change. */
export const StatusesSection: React.FC<StatusesSectionProps> = ({
  config,
  isReadOnly,
  isSaving,
  save,
  onReload,
}) => {
  const [flyout, setFlyout] = useState<FlyoutState | null>(null);
  const [flyoutError, setFlyoutError] = useState<string | undefined>();
  const [actionError, setActionError] = useState<SaveStatusesResult | null>(null);

  const { statuses, pauseReasons } = config;
  const showOnHoldCallout = !hasPausingStatus(statuses);

  /** Saves a row action; a refused change is explained above the blocks. */
  const saveAction = async (draft: StatusesDraft) => {
    const result = await save(withSeededPauseReasons(draft));
    setActionError(result.ok ? null : result);
  };

  const addStatus = (
    category: InvestigationStatus,
    values: { label: string; pausesTimeTracking: boolean }
  ): StatusesDraft => {
    const created: CaseStatusConfiguration = {
      key: generateStatusKey(
        values.label,
        statuses.map(({ key }) => key)
      ),
      label: values.label,
      category,
      order: statuses.length,
      isDefault: false,
      disabled: false,
      ...(values.pausesTimeTracking ? { pausesTimeTracking: true } : {}),
    };
    return { statuses: reindex([...sortByOrder(statuses), created]), pauseReasons };
  };

  const editStatus = (
    status: CaseStatusConfiguration,
    values: { label: string; pausesTimeTracking: boolean }
  ): StatusesDraft => ({
    statuses: statuses.map((candidate) =>
      candidate.key === status.key
        ? {
            ...candidate,
            label: values.label,
            pausesTimeTracking: values.pausesTimeTracking ? true : undefined,
          }
        : candidate
    ),
    pauseReasons,
  });

  const submitFlyout = async (values: { label: string; pausesTimeTracking: boolean }) => {
    if (!flyout) return;
    const draft = flyout.status
      ? editStatus(flyout.status, values)
      : addStatus(flyout.category, values);
    const result = await save(withSeededPauseReasons(draft));
    if (result.ok) {
      setFlyout(null);
      setFlyoutError(undefined);
      setActionError(null);
      return;
    }
    setFlyoutError(result.error);
    if (result.isConflict) {
      setFlyout(null);
      setActionError(result);
    }
  };

  const closeFlyout = () => {
    setFlyout(null);
    setFlyoutError(undefined);
  };

  return (
    <section data-test-subj="investigationStatusesSection">
      <EuiTitle size="s">
        <h2>{i18n.STATUSES_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>{i18n.STATUSES_DESCRIPTION}</p>
      </EuiText>
      {actionError?.error ? (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            announceOnMount
            color="danger"
            title={actionError.isConflict ? i18n.CONFLICT_ERROR_TITLE : i18n.SAVE_ERROR_TITLE}
            data-test-subj="investigationStatusesError"
          >
            <p>{actionError.error}</p>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              {actionError.isConflict ? (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    color="danger"
                    onClick={() => {
                      setActionError(null);
                      onReload();
                    }}
                    data-test-subj="investigationStatusesReload"
                  >
                    {i18n.RELOAD}
                  </EuiButton>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  color="danger"
                  onClick={() => setActionError(null)}
                  data-test-subj="investigationStatusesDismiss"
                >
                  {i18n.DISMISS}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiCallOut>
        </>
      ) : null}
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="m">
        {CASE_STATUS_CATEGORIES.map((category) => (
          <EuiFlexItem key={category}>
            <CategoryBlock
              category={category}
              statuses={statuses}
              isReadOnly={isReadOnly || isSaving}
              showOnHoldCallout={category === 'in-progress' && showOnHoldCallout}
              onAdd={(target) => setFlyout({ category: target })}
              onAddOnHold={() =>
                void saveAction(
                  addStatus('in-progress', { label: i18n.ON_HOLD_LABEL, pausesTimeTracking: true })
                )
              }
              onEdit={(status) => setFlyout({ category: status.category, status })}
              onSetDefault={(status) =>
                void saveAction({
                  statuses: setDefaultStatus(statuses, status.key),
                  pauseReasons,
                })
              }
              onMove={(status, direction) =>
                void saveAction({
                  statuses: moveStatus(statuses, status.key, direction),
                  pauseReasons,
                })
              }
              onToggleDisabled={(status) =>
                void saveAction({
                  statuses: statuses.map((candidate) =>
                    candidate.key === status.key
                      ? { ...candidate, disabled: !candidate.disabled }
                      : candidate
                  ),
                  pauseReasons,
                })
              }
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {flyout ? (
        <StatusFlyout
          category={flyout.category}
          status={flyout.status}
          statuses={statuses}
          isSaving={isSaving}
          error={flyoutError}
          onSubmit={(values) => void submitFlyout(values)}
          onClose={closeFlyout}
        />
      ) : null}
    </section>
  );
};
StatusesSection.displayName = 'StatusesSection';
