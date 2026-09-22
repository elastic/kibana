/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiEmptyPrompt, EuiFlexGrid, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  useContentListItems,
  useContentListPhase,
  useContentListSearch,
} from '@kbn/content-list-provider';
import React, { useCallback, useState } from 'react';
import type { AiIndexHttpItem } from '../../../../common/http_api/ai_indices';
import { useKibana } from '../../hooks/use_kibana';
import { useNavigation } from '../../hooks/use_navigation';
import { getAiIndexDetailPath } from '../../paths';
import { toAiIndexHttpItem } from '../../utils/ai_index_content_list_utils';
import { AiIndexCard } from './ai_index_card';
import { AiIndexDeleteConfirmModal } from './ai_index_delete_confirm_modal';
import { AiIndexListSkeleton } from './ai_index_list_states';

const GRID_COLUMNS = 3;

export const AiIndexCardGrid = () => {
  const { createContextEngineUrl } = useNavigation();
  const {
    services: { notifications },
  } = useKibana();
  const phase = useContentListPhase();
  const { items, totalItems, hasNoResults, refetch } = useContentListItems();
  const { setQueryFromText } = useContentListSearch();
  const [aiIndexToDelete, setAiIndexToDelete] = useState<AiIndexHttpItem | null>(null);

  const onDeleteSuccess = useCallback(() => {
    void refetch().catch((e) => {
      notifications.toasts.addError(e instanceof Error ? e : new Error(String(e)), {
        title: i18n.translate('xpack.contextEngine.landing.deleteListRefreshError', {
          defaultMessage: 'AI index was deleted, but the list could not be refreshed',
        }),
      });
    });
  }, [notifications.toasts, refetch]);

  if (phase === 'initialLoad') {
    return <AiIndexListSkeleton />;
  }

  if (hasNoResults) {
    return (
      <EuiEmptyPrompt
        iconType="magnify"
        data-test-subj="contextAiIndexCardsNoMatches"
        title={
          <h2>
            <FormattedMessage
              id="xpack.contextEngine.landing.noMatchesTitle"
              defaultMessage="No AI Indexes match your search"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.contextEngine.landing.noMatchesBody"
              defaultMessage="Try a different search term, or remove some of the filters."
            />
          </p>
        }
        actions={
          <EuiButtonEmpty
            data-test-subj="contextAiIndexListClearFilters"
            onClick={() => setQueryFromText('')}
          >
            <FormattedMessage
              id="xpack.contextEngine.landing.clearFilters"
              defaultMessage="Clear filters"
            />
          </EuiButtonEmpty>
        }
      />
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <EuiText size="xs" color="subdued" data-test-subj="contextAiIndexListCount">
        <FormattedMessage
          id="xpack.contextEngine.landing.matchCount"
          defaultMessage="{count, plural, one {# AI Index} other {# AI Indexes}}"
          values={{ count: totalItems }}
        />
      </EuiText>
      <EuiSpacer size="s" />

      <EuiFlexGrid columns={GRID_COLUMNS} gutterSize="l">
        {items.map((item) => {
          const aiIndex = toAiIndexHttpItem(item);

          return (
            <AiIndexCard
              key={aiIndex.id}
              aiIndex={aiIndex}
              href={createContextEngineUrl(getAiIndexDetailPath(aiIndex.id))}
              onDeleteClick={() => setAiIndexToDelete(aiIndex)}
            />
          );
        })}
      </EuiFlexGrid>
      {aiIndexToDelete !== null && (
        <AiIndexDeleteConfirmModal
          aiIndex={aiIndexToDelete}
          onClose={() => setAiIndexToDelete(null)}
          onSuccess={onDeleteSuccess}
        />
      )}
    </>
  );
};
