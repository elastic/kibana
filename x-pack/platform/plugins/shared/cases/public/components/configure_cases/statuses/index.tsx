/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { MAX_CASE_STATUSES_PER_CATEGORY } from '../../../../common/constants';
import type { CaseStatusesConfiguration } from '../../../../common/types/domain';
import { CaseStatuses } from '../../../../common/types/domain';
import { CASE_STATUS_CATEGORIES, getBuiltInStatuses } from '../../../../common/utils/statuses';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { PauseReasons } from './pause_reasons';
import { StatusRow } from './status_row';
import * as i18n from './translations';

const CATEGORY_HELP: Record<CaseStatuses, string> = {
  open: i18n.OPEN_CATEGORY_HELP,
  'in-progress': i18n.IN_PROGRESS_CATEGORY_HELP,
  closed: i18n.CLOSED_CATEGORY_HELP,
};

export interface CaseStatusesSectionProps {
  statuses: CaseStatusesConfiguration;
  pauseReasons: string[];
  disabled: boolean;
  isLoading: boolean;
  onAddStatus: (category: CaseStatuses) => void;
  onAddOnHoldStatus: () => void;
  onEditStatus: (key: string) => void;
  onMoveStatus: (key: string, direction: 'up' | 'down') => void;
  onSetDefaultStatus: (key: string) => void;
  onToggleStatusDisabled: (key: string) => void;
  onAddPauseReason: () => void;
  onEditPauseReason: (reason: string) => void;
  onMovePauseReason: (reason: string, direction: 'up' | 'down') => void;
  onRemovePauseReason: (reason: string) => void;
}

const CaseStatusesSectionComponent: React.FC<CaseStatusesSectionProps> = ({
  statuses,
  pauseReasons,
  disabled,
  isLoading,
  onAddStatus,
  onAddOnHoldStatus,
  onEditStatus,
  onMoveStatus,
  onSetDefaultStatus,
  onToggleStatusDisabled,
  onAddPauseReason,
  onEditPauseReason,
  onMovePauseReason,
  onRemovePauseReason,
}) => {
  const { permissions } = useCasesContext();
  const canModify = !disabled && permissions.settings;
  const hasPausingStatus = statuses.some((status) => status.pausesTimeTracking);

  if (!permissions.settings) {
    return null;
  }

  return (
    <div data-test-subj="case-statuses">
      {CASE_STATUS_CATEGORIES.map((category) => {
        const inCategory = statuses.filter((status) => status.category === category);
        const enabled = inCategory.filter((status) => !status.disabled);
        const disabledStatuses = inCategory.filter((status) => status.disabled);
        const categoryLabel =
          getBuiltInStatuses().find((status) => status.category === category)?.label ?? category;
        const renderRow = (status: CaseStatusesConfiguration[number], index: number) => (
          <StatusRow
            key={status.key}
            status={status}
            statuses={statuses}
            disabled={!canModify}
            isFirstInCategory={index === 0}
            isLastInCategory={index === enabled.length - 1}
            categoryLabel={categoryLabel}
            onEdit={onEditStatus}
            onMove={onMoveStatus}
            onSetDefault={onSetDefaultStatus}
            onToggleDisabled={onToggleStatusDisabled}
          />
        );

        return (
          <div key={category} data-test-subj={`case-statuses-group-${category}`}>
            <EuiSpacer size="m" />
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h3>{categoryLabel}</h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.ENABLED_COUNT(enabled.length)}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued" data-test-subj={`case-statuses-help-${category}`}>
              {CATEGORY_HELP[category]}
            </EuiText>
            <EuiSpacer size="s" />
            {enabled.map(renderRow)}
            {disabledStatuses.length > 0 && (
              <>
                <EuiSpacer size="s" />
                <EuiAccordion
                  id={`case-statuses-disabled-${category}`}
                  buttonContent={
                    <EuiText size="s" color="subdued">
                      {i18n.DISABLED_COUNT(disabledStatuses.length)}
                    </EuiText>
                  }
                  buttonProps={{ 'data-test-subj': `case-statuses-disabled-${category}-toggle` }}
                  data-test-subj={`case-statuses-disabled-${category}`}
                >
                  {disabledStatuses.map(renderRow)}
                </EuiAccordion>
              </>
            )}
            {category === CaseStatuses['in-progress'] && !hasPausingStatus && (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut
                  announceOnMount
                  size="s"
                  title={i18n.ON_HOLD_CALLOUT_TITLE}
                  iconType="pause"
                  data-test-subj="case-statuses-on-hold-callout"
                >
                  <p>{i18n.ON_HOLD_CALLOUT_BODY}</p>
                  <EuiButtonEmpty
                    size="s"
                    iconType="plusCircle"
                    isDisabled={!canModify}
                    isLoading={isLoading}
                    onClick={onAddOnHoldStatus}
                    data-test-subj="case-statuses-add-on-hold"
                  >
                    {i18n.ADD_ON_HOLD_STATUS}
                  </EuiButtonEmpty>
                </EuiCallOut>
              </>
            )}
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                {inCategory.length < MAX_CASE_STATUSES_PER_CATEGORY ? (
                  <EuiButtonEmpty
                    size="s"
                    iconType="plusCircle"
                    isLoading={isLoading}
                    isDisabled={!canModify}
                    onClick={() => onAddStatus(category)}
                    data-test-subj={`case-statuses-add-${category}`}
                  >
                    {i18n.ADD_STATUS}
                  </EuiButtonEmpty>
                ) : (
                  <EuiText
                    size="xs"
                    color="subdued"
                    data-test-subj={`case-statuses-limit-${category}`}
                  >
                    {i18n.MAX_STATUSES(MAX_CASE_STATUSES_PER_CATEGORY, categoryLabel)}
                  </EuiText>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        );
      })}
      {hasPausingStatus && (
        <PauseReasons
          reasons={pauseReasons}
          hasPausingStatus={statuses.some(
            (status) => status.pausesTimeTracking && !status.disabled
          )}
          disabled={!canModify}
          isLoading={isLoading}
          onAdd={onAddPauseReason}
          onEdit={onEditPauseReason}
          onMove={onMovePauseReason}
          onRemove={onRemovePauseReason}
        />
      )}
    </div>
  );
};

CaseStatusesSectionComponent.displayName = 'CaseStatusesSection';

export const CaseStatusesSection = React.memo(CaseStatusesSectionComponent);
