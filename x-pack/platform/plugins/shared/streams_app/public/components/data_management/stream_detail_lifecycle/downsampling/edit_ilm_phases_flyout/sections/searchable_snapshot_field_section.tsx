/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { IlmPolicyPhases } from '@kbn/streams-schema';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSwitch,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { IlmPhasesFlyoutFormInternal } from '../form';
import { SearchableSnapshotRepositoryField } from '../form';

export interface SearchableSnapshotFieldSectionProps {
  form: FormHook<IlmPolicyPhases, IlmPhasesFlyoutFormInternal>;
  phaseName: 'cold' | 'frozen';
  dataTestSubj: string;
  searchableSnapshotRepositories: string[];
  canCreateRepository: boolean;
  isLoadingSearchableSnapshotRepositories?: boolean;
  onRefreshSearchableSnapshotRepositories?: () => void;
  onCreateSnapshotRepository?: () => void;
}

export const SearchableSnapshotFieldSection = ({
  form,
  phaseName,
  dataTestSubj,
  searchableSnapshotRepositories,
  canCreateRepository,
  isLoadingSearchableSnapshotRepositories,
  onRefreshSearchableSnapshotRepositories,
  onCreateSnapshotRepository,
}: SearchableSnapshotFieldSectionProps) => {
  const repositoryPath = `_meta.searchableSnapshot.repository`;
  const enabledPath = `_meta.cold.searchableSnapshotEnabled`;

  const titleId = useGeneratedHtmlId({
    prefix: dataTestSubj,
  });

  const isFrozenPhase = phaseName === 'frozen';

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
              <EuiTitle size="xxs">
                <h3 id={titleId}>
                  {i18n.translate('xpack.streams.editIlmPhasesFlyout.searchableSnapshotTitle', {
                    defaultMessage: 'Searchable snapshot',
                  })}
                </h3>
              </EuiTitle>
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
              aria-labelledby={titleId}
              compressed
              checked={isEnabled}
              data-test-subj={`${dataTestSubj}SearchableSnapshotSwitch`}
              onChange={(e) => {
                const enabled = e.target.checked;
                enabledField!.setValue(enabled);

                if (!enabled) return;
                if (searchableSnapshotRepositories.length !== 1) return;

                const repository = searchableSnapshotRepositories[0];
                if (!repository) return;

                const currentValue = String(repositoryField.value ?? '').trim();
                if (currentValue !== '') return;

                repositoryField.setValue(repository);
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
          showCreateRepositoryLink={canCreateRepository}
          dataTestSubj={dataTestSubj}
        />
      )}
    </EuiFlexGroup>
  );
};
