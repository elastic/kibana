/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { IlmPolicyPhases } from '@kbn/streams-schema';
import {
  type FormHook,
  getFieldValidityAndErrorMessage,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiButtonIcon, EuiFormRow, EuiLink, EuiSelect, EuiText } from '@elastic/eui';
import type { IlmPhasesFlyoutFormInternal } from '../types';

export interface SearchableSnapshotRepositoryFieldProps {
  form: FormHook<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>;
  repositoryOptions: Array<{ value: string; text: string }>;
  isLoadingSearchableSnapshotRepositories?: boolean;
  onRefreshSearchableSnapshotRepositories?: () => void;
  onCreateSnapshotRepository?: () => void;
  dataTestSubj: string;
}

export const SearchableSnapshotRepositoryField = ({
  form,
  repositoryOptions,
  isLoadingSearchableSnapshotRepositories,
  onRefreshSearchableSnapshotRepositories,
  onCreateSnapshotRepository,
  dataTestSubj,
}: SearchableSnapshotRepositoryFieldProps) => {
  const path = `_meta.searchableSnapshot.repository`;
  useFormData({ form, watch: path });
  const field = form.getFields()[path];
  if (!field) return null;

  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const value = String(field.value ?? '');

  return (
    <EuiFormRow
      label={i18n.translate('xpack.streams.editIlmPhasesFlyout.snapshotRepositoryLabel', {
        defaultMessage: 'Snapshot repository',
      })}
      labelAppend={
        <EuiText size="xs">
          <EuiLink
            onClick={onCreateSnapshotRepository}
            data-test-subj={`${dataTestSubj}CreateSnapshotRepositoryLink`}
          >
            {i18n.translate('xpack.streams.editIlmPhasesFlyout.createSnapshotRepository', {
              defaultMessage: 'Create repository',
            })}
          </EuiLink>
        </EuiText>
      }
      helpText={i18n.translate('xpack.streams.editIlmPhasesFlyout.snapshotRepositoryHelp', {
        defaultMessage: 'Each phase uses the same snapshot repository.',
      })}
      isInvalid={isInvalid}
      error={errorMessage}
    >
      <EuiSelect
        fullWidth
        isInvalid={isInvalid}
        aria-label={i18n.translate(
          'xpack.streams.editIlmPhasesFlyout.snapshotRepositoryAriaLabel',
          {
            defaultMessage: 'Snapshot repository',
          }
        )}
        data-test-subj={`${dataTestSubj}SnapshotRepositorySelect`}
        options={repositoryOptions}
        value={value}
        onChange={(e) => field.onChange(e)}
        append={
          <EuiButtonIcon
            display="empty"
            iconType="refresh"
            size="xs"
            aria-label={i18n.translate(
              'xpack.streams.editIlmPhasesFlyout.refreshSnapshotRepositoriesAriaLabel',
              { defaultMessage: 'Refresh snapshot repositories' }
            )}
            isLoading={Boolean(isLoadingSearchableSnapshotRepositories)}
            data-test-subj={`${dataTestSubj}SnapshotRepositoryRefreshButton`}
            onClick={() => onRefreshSearchableSnapshotRepositories?.()}
          />
        }
      />
    </EuiFormRow>
  );
};
