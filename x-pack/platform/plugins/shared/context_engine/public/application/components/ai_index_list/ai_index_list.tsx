/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { AiIndexHttpItem } from '../../../../common/http_api/ai_indices';
import { useAiIndexListState } from '../../hooks/use_ai_index_list_state';
import { useNavigation } from '../../hooks/use_navigation';
import { getAiIndexDetailPath } from '../../paths';
import { CreateAiIndexButton } from '../create_ai_index_button';
import { AiIndexCard } from './ai_index_card';
import { AiIndexListControls } from './ai_index_list_controls';

const SKELETON_CARD_COUNT = 3;
const GRID_COLUMNS = 3;

interface AiIndexListProps {
  aiIndices: AiIndexHttpItem[];
  isLoading: boolean;
  error: Error | undefined;
}

export const AiIndexList = ({ aiIndices, isLoading, error }: AiIndexListProps) => {
  const { createContextEngineUrl } = useNavigation();
  const {
    filters,
    setQuery,
    setTypes,
    setOwners,
    clearFilters,
    matchCount,
    visibleAiIndices,
    pageCount,
    activePage,
    setActivePage,
  } = useAiIndexListState(aiIndices);

  if (isLoading) {
    return (
      <EuiFlexGrid columns={GRID_COLUMNS} gutterSize="l">
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
          <EuiSkeletonRectangle
            key={`contextAiIndexCardSkeleton-${index}`}
            width="100%"
            height={160}
            borderRadius="m"
            data-test-subj="contextAiIndexCardSkeleton"
          />
        ))}
      </EuiFlexGrid>
    );
  }

  if (error) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        data-test-subj="contextAiIndexCardsError"
        title={
          <h2>
            <FormattedMessage
              id="xpack.contextEngine.landing.errorTitle"
              defaultMessage="Unable to load AI Indexes"
            />
          </h2>
        }
        body={<p>{error.message}</p>}
      />
    );
  }

  if (aiIndices.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="index"
        data-test-subj="contextAiIndexCardsEmpty"
        title={
          <h2>
            <FormattedMessage
              id="xpack.contextEngine.landing.emptyTitle"
              defaultMessage="No AI Indexes yet"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.contextEngine.landing.emptyBody"
              defaultMessage="Create an AI Index to organize and retrieve contextual knowledge for your agents."
            />
          </p>
        }
        actions={<CreateAiIndexButton />}
      />
    );
  }

  return (
    <>
      <AiIndexListControls
        filters={filters}
        setQuery={setQuery}
        setTypes={setTypes}
        setOwners={setOwners}
      />
      <EuiSpacer size="l" />

      {matchCount === 0 ? (
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
            <EuiButtonEmpty data-test-subj="contextAiIndexListClearFilters" onClick={clearFilters}>
              <FormattedMessage
                id="xpack.contextEngine.landing.clearFilters"
                defaultMessage="Clear filters"
              />
            </EuiButtonEmpty>
          }
        />
      ) : (
        <>
          <EuiText size="xs" color="subdued" data-test-subj="contextAiIndexListCount">
            <FormattedMessage
              id="xpack.contextEngine.landing.matchCount"
              defaultMessage="{count, plural, one {# AI Index} other {# AI Indexes}}"
              values={{ count: matchCount }}
            />
          </EuiText>
          <EuiSpacer size="s" />

          <EuiFlexGrid columns={GRID_COLUMNS} gutterSize="l">
            {visibleAiIndices.map((aiIndex) => (
              <AiIndexCard
                key={aiIndex.id}
                aiIndex={aiIndex}
                href={createContextEngineUrl(getAiIndexDetailPath(aiIndex.id))}
              />
            ))}
          </EuiFlexGrid>

          {pageCount > 1 && (
            <>
              <EuiSpacer size="l" />
              <EuiFlexGroup justifyContent="spaceAround">
                <EuiFlexItem grow={false}>
                  <EuiPagination
                    data-test-subj="contextAiIndexListPagination"
                    aria-label={i18n.translate('xpack.contextEngine.landing.paginationLabel', {
                      defaultMessage: 'AI Index pagination',
                    })}
                    pageCount={pageCount}
                    activePage={activePage}
                    onPageClick={setActivePage}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          )}
        </>
      )}
    </>
  );
};
