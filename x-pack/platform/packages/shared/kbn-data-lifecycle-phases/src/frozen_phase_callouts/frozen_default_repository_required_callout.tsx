/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiSpacer, EuiSplitButton, EuiText } from '@elastic/eui';

export interface FrozenDefaultRepositoryRequiredCalloutProps {
  onCreateDefaultRepository?: () => void;
  createDefaultRepositoryHref?: string;
  /**
   * URL to the Snapshot and Restore repositories list. When the user already has repositories
   * configured (see `hasExistingRepositories`) the primary action links here so they can pick one
   * as the default instead of creating a new repository.
   */
  manageRepositoriesUrl?: string;
  /**
   * Whether the user already has at least one snapshot repository configured. When `true` (and a
   * `manageRepositoriesUrl` is provided) the callout directs the user to the repositories list to
   * select a default; otherwise it directs them to create a new default repository.
   */
  hasExistingRepositories?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  calloutTestSubj?: string;
  createButtonTestSubj?: string;
  manageRepositoriesButtonTestSubj?: string;
  refreshButtonTestSubj?: string;
}

export const FrozenDefaultRepositoryRequiredCallout = ({
  onCreateDefaultRepository,
  createDefaultRepositoryHref,
  manageRepositoriesUrl,
  hasExistingRepositories = false,
  onRefresh,
  isRefreshing,
  calloutTestSubj,
  createButtonTestSubj,
  manageRepositoriesButtonTestSubj,
  refreshButtonTestSubj,
}: FrozenDefaultRepositoryRequiredCalloutProps) => {
  // When the user already has repositories but none is set as the default, send them to the
  // repositories list to pick one. Otherwise send them to create a new default repository.
  const shouldManageExisting = hasExistingRepositories && Boolean(manageRepositoriesUrl);

  return (
    <EuiCallOut
      size="s"
      color="warning"
      announceOnMount={false}
      title={i18n.translate(
        'xpack.dataLifecyclePhases.frozen.defaultRepositoryRequiredCallout.title',
        {
          defaultMessage: 'Default snapshot repository required',
        }
      )}
      data-test-subj={calloutTestSubj}
    >
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.dataLifecyclePhases.frozen.defaultRepositoryRequiredCallout.body', {
          defaultMessage:
            'The previously assigned default searchable snapshot repository is no longer available. This phase will be ignored until you assign a new default repository, then refresh this panel.',
        })}
      </EuiText>

      {(onCreateDefaultRepository ||
        createDefaultRepositoryHref ||
        shouldManageExisting ||
        onRefresh) && (
        <>
          <EuiSpacer size="m" />
          <EuiSplitButton size="s" color="warning">
            {shouldManageExisting ? (
              <EuiSplitButton.ActionPrimary
                data-test-subj={manageRepositoriesButtonTestSubj}
                href={manageRepositoriesUrl}
                target="_blank"
              >
                {i18n.translate(
                  'xpack.dataLifecyclePhases.frozen.defaultRepositoryRequiredCallout.manageRepositories',
                  { defaultMessage: 'Manage repositories' }
                )}
              </EuiSplitButton.ActionPrimary>
            ) : (
              <EuiSplitButton.ActionPrimary
                data-test-subj={createButtonTestSubj}
                isDisabled={!onCreateDefaultRepository && !createDefaultRepositoryHref}
                href={createDefaultRepositoryHref}
                target={createDefaultRepositoryHref ? '_blank' : undefined}
                onClick={createDefaultRepositoryHref ? undefined : onCreateDefaultRepository}
              >
                {i18n.translate(
                  'xpack.dataLifecyclePhases.frozen.defaultRepositoryRequiredCallout.createButton',
                  { defaultMessage: 'Create default repository' }
                )}
              </EuiSplitButton.ActionPrimary>
            )}
            <EuiSplitButton.ActionSecondary
              iconType="refresh"
              isLoading={Boolean(isRefreshing)}
              disabled={Boolean(isRefreshing) || !onRefresh}
              aria-label={i18n.translate(
                'xpack.dataLifecyclePhases.frozen.defaultRepositoryRequiredCallout.refreshButtonAriaLabel',
                { defaultMessage: 'Refresh panel' }
              )}
              data-test-subj={refreshButtonTestSubj}
              onClick={onRefresh}
            />
          </EuiSplitButton>
        </>
      )}
    </EuiCallOut>
  );
};
