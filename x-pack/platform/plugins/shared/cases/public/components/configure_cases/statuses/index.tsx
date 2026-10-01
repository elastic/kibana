/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { Status } from '@kbn/cases-components';
import { MAX_CASE_STATUSES_PER_CATEGORY } from '../../../../common/constants';
import type { CaseStatuses, CaseStatusesConfiguration } from '../../../../common/types/domain';
import { CASE_STATUS_CATEGORIES, getBuiltInStatuses } from '../../../../common/utils/statuses';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { StatusRow } from './status_row';
import * as i18n from './translations';

const CATEGORY_HELP: Record<CaseStatuses, string> = {
  open: i18n.OPEN_CATEGORY_HELP,
  'in-progress': i18n.IN_PROGRESS_CATEGORY_HELP,
  closed: i18n.CLOSED_CATEGORY_HELP,
};

export interface CaseStatusesSectionProps {
  statuses: CaseStatusesConfiguration;
  disabled: boolean;
  isLoading: boolean;
  onAddStatus: (category: CaseStatuses) => void;
  onEditStatus: (key: string) => void;
  onMoveStatus: (key: string, direction: 'up' | 'down') => void;
  onSetDefaultStatus: (key: string) => void;
  onToggleStatusDisabled: (key: string) => void;
}

const CaseStatusesSectionComponent: React.FC<CaseStatusesSectionProps> = ({
  statuses,
  disabled,
  isLoading,
  onAddStatus,
  onEditStatus,
  onMoveStatus,
  onSetDefaultStatus,
  onToggleStatusDisabled,
}) => {
  const { permissions } = useCasesContext();
  const canModify = !disabled && permissions.settings;

  if (!permissions.settings) {
    return null;
  }

  return (
    <div data-test-subj="case-statuses">
      {CASE_STATUS_CATEGORIES.map((category) => {
        const inCategory = statuses.filter((status) => status.category === category);
        const enabledCount = inCategory.filter((status) => !status.disabled).length;
        const categoryLabel =
          getBuiltInStatuses().find((status) => status.category === category)?.label ?? category;

        return (
          <div key={category} data-test-subj={`case-statuses-group-${category}`}>
            <EuiSpacer size="m" />
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h3>
                    <Status status={category} />
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.ENABLED_COUNT(enabledCount)}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued" data-test-subj={`case-statuses-help-${category}`}>
              {CATEGORY_HELP[category]}
            </EuiText>
            <EuiSpacer size="s" />
            {inCategory.map((status, index) => (
              <StatusRow
                key={status.key}
                status={status}
                statuses={statuses}
                disabled={!canModify}
                isFirstInCategory={index === 0}
                isLastInCategory={index === inCategory.length - 1}
                categoryLabel={categoryLabel}
                onEdit={onEditStatus}
                onMove={onMoveStatus}
                onSetDefault={onSetDefaultStatus}
                onToggleDisabled={onToggleStatusDisabled}
              />
            ))}
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
    </div>
  );
};

CaseStatusesSectionComponent.displayName = 'CaseStatusesSection';

export const CaseStatusesSection = React.memo(CaseStatusesSectionComponent);
