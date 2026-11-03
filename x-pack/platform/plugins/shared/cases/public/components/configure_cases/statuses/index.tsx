/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { MAX_CASE_STATUSES } from '../../../../common/constants';
import type { CaseStatusDefinition } from '../../../../common/types/domain';
import { validateStatuses } from '../../../../common/utils/statuses';
import { isCustomStatusesEnabled } from '../../../common/custom_statuses';
import { useGetCaseStatuses } from '../../../containers/use_get_case_statuses';
import { usePersistCaseStatuses } from '../../../containers/use_persist_case_statuses';
import type { ServerError } from '../../../types';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { SettingsSection } from '../settings_section';
import { SaveErrors } from './save_errors';
import { StatusFormModal } from './status_form_modal';
import { StatusRow } from './status_row';
import type { NewStatus } from './utils';
import {
  addStatus,
  moveStatus,
  setDefaultStatus,
  toggleStatusDisabled,
  updateStatus,
} from './utils';
import * as i18n from './translations';

type FormState = { mode: 'add' } | { mode: 'edit'; status: CaseStatusDefinition } | null;

const getServerErrorMessage = (error: ServerError): string => error.body?.message ?? error.message;

/**
 * Manages the statuses of the current space. Statuses belong to the space, not to a solution, so
 * this section does not read the owner in context.
 */
const CaseStatusesSettingsComponent: React.FC = () => {
  const { permissions } = useCasesContext();
  const { data: statuses, isLoading } = useGetCaseStatuses();
  const { mutate: persistStatuses, isLoading: isSaving } = usePersistCaseStatuses();
  const [errors, setErrors] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(null);

  const enabledStatuses = useMemo(() => statuses.filter((status) => !status.disabled), [statuses]);
  const disabledStatuses = useMemo(() => statuses.filter((status) => status.disabled), [statuses]);

  const save = useCallback(
    (next: CaseStatusDefinition[], onSaved?: () => void) => {
      const problems = validateStatuses(next, statuses);
      setErrors(problems);
      if (problems.length > 0) {
        return;
      }

      persistStatuses(
        { statuses: next },
        {
          onSuccess: () => onSaved?.(),
          onError: (error: ServerError) => setErrors([getServerErrorMessage(error)]),
        }
      );
    },
    [persistStatuses, statuses]
  );

  const closeForm = useCallback(() => {
    setForm(null);
    setErrors([]);
  }, []);

  const onSaveForm = useCallback(
    (values: NewStatus) => {
      if (form == null) {
        return;
      }
      const next =
        form.mode === 'add'
          ? addStatus(statuses, values)
          : updateStatus(statuses, form.status.key, values);
      save(next, closeForm);
    },
    [closeForm, form, save, statuses]
  );

  const onEdit = useCallback((status: CaseStatusDefinition) => {
    setErrors([]);
    setForm({ mode: 'edit', status });
  }, []);
  const onMove = useCallback(
    (key: string, direction: 'up' | 'down') => save(moveStatus(statuses, key, direction)),
    [save, statuses]
  );
  const onSetDefault = useCallback(
    (key: string) => save(setDefaultStatus(statuses, key)),
    [save, statuses]
  );
  const onToggleDisabled = useCallback(
    (key: string) => save(toggleStatusDisabled(statuses, key)),
    [save, statuses]
  );

  if (!isCustomStatusesEnabled() || !permissions.settings) {
    return null;
  }

  const isBusy = isLoading || isSaving;
  const isAtLimit = statuses.length >= MAX_CASE_STATUSES;

  const renderRow = (status: CaseStatusDefinition, index: number, list: CaseStatusDefinition[]) => (
    <StatusRow
      key={status.key}
      status={status}
      disabled={isBusy}
      canMoveUp={index > 0}
      canMoveDown={index < list.length - 1}
      onEdit={onEdit}
      onMove={onMove}
      onSetDefault={onSetDefault}
      onToggleDisabled={onToggleDisabled}
    />
  );

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="case-statuses-panel">
      <SettingsSection
        data-test-subj="case-statuses-section"
        title={i18n.TITLE}
        description={i18n.DESCRIPTION}
      >
        {form == null && <SaveErrors errors={errors} />}
        {isLoading ? (
          <EuiLoadingSpinner size="l" data-test-subj="case-statuses-loading" />
        ) : (
          <>
            <div data-test-subj="case-statuses-enabled-list">{enabledStatuses.map(renderRow)}</div>
            {disabledStatuses.length > 0 && (
              <>
                <EuiSpacer size="m" />
                <EuiAccordion
                  id="case-statuses-disabled"
                  buttonContent={i18n.DISABLED_STATUSES(disabledStatuses.length)}
                  initialIsOpen={false}
                  data-test-subj="case-statuses-disabled-accordion"
                >
                  {disabledStatuses.map(renderRow)}
                </EuiAccordion>
              </>
            )}
            <EuiSpacer size="m" />
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  iconType="plusCircle"
                  isDisabled={isBusy || isAtLimit}
                  onClick={() => {
                    setErrors([]);
                    setForm({ mode: 'add' });
                  }}
                  data-test-subj="case-statuses-add"
                >
                  {i18n.ADD_STATUS}
                </EuiButtonEmpty>
              </EuiFlexItem>
              {isAtLimit && (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued" data-test-subj="case-statuses-limit">
                    {i18n.MAX_STATUSES(MAX_CASE_STATUSES)}
                  </EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </>
        )}
      </SettingsSection>
      {form != null && (
        <StatusFormModal
          status={form.mode === 'edit' ? form.status : null}
          statuses={statuses}
          isSaving={isSaving}
          errors={errors}
          onSave={onSaveForm}
          onClose={closeForm}
        />
      )}
    </EuiPanel>
  );
};

CaseStatusesSettingsComponent.displayName = 'CaseStatusesSettings';

export const CaseStatusesSettings = React.memo(CaseStatusesSettingsComponent);
