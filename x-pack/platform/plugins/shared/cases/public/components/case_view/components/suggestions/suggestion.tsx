/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { SuggestionPayload } from '@kbn/observability-case-suggestion-registry-plugin/public';
import {
  EuiPanel,
  EuiText,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
} from '@elastic/eui';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import { useKibana } from '../../../../common/lib/kibana';
import { useCaseViewParams } from '../../../../common/navigation';
import { useCasesContext } from '../../../cases_context/use_cases_context';
import { useRefreshCaseViewPage } from '../../use_on_refresh_case_view_page';

export const Suggestion = ({ suggestion }: { suggestion: SuggestionPayload }) => {
  const [isAttached, setIsAttached] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const {
    services: {
      observabilityCaseSuggestionRegistry: { caseSuggestionRegistry },
      http,
      notifications,
    },
  } = useKibana();
  const { detailName: caseId } = useCaseViewParams();
  const refreshCaseViewPage = useRefreshCaseViewPage();
  const { owner } = useCasesContext();
  const repositoryClient = useMemo(() => createRepositoryClient({ http }), [http]);
  const attachments = useMemo(() => {
    return suggestion.data.attachments.map((attachment) => ({
      ...attachment.attachment,
      owner: owner[0],
    }));
  }, [suggestion.data.attachments, owner]);
  console.log('Suggestion attachments:', attachments);

  const onAttach = useCallback(async () => {
    setIsLoading(true);
    repositoryClient
      .fetch(`POST /internal/cases/${caseId}/attachments/_bulk_create`, {
        params: {
          body: attachments,
        },
      })
      .then((response) => {
        setIsAttached(true);
        refreshCaseViewPage();
        notifications.toasts.addSuccess({
          title: 'Suggestion added successfully',
        });
        console.log('Attachments created:', response);
      })
      .catch((error) => {
        console.log('error', error);
      });
  }, [caseId, repositoryClient, attachments, refreshCaseViewPage, notifications.toasts]);

  const Children = caseSuggestionRegistry.get(suggestion.suggestionId)?.children;

  if (isAttached || !Children) {
    return null;
  }

  return (
    <EuiPanel paddingSize="s" hasShadow={false} hasBorder={true}>
      <EuiText size="s" data-test-subj="caseSuggestionTitle">
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="sparkles" size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            <strong>{'Suggestion'}</strong>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiText>
      <EuiSpacer size="s" />
      <Children data={suggestion.data} suggestionId={suggestion.suggestionId} />
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            // onClick={() => {
            //   caseSuggestionRegistry.remove(suggestion.suggestionId);
            // }}
            data-test-subj="caseSuggestionRemoveButton"
          >
            {'Dismiss'}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            size="s"
            onClick={onAttach}
            data-test-subj="caseSuggestionAttachButton"
            isLoading={isLoading}
          >
            {'Attach to case'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

Suggestion.displayName = 'Suggestion';
