/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiCard,
  EuiEmptyPrompt,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSkeletonRectangle,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import React from 'react';
import type { AiIndexHttpItem } from '../../../common/http_api/ai_indices';
import { useListAiIndices } from '../hooks/use_list_ai_indices';
import { useNavigation } from '../hooks/use_navigation';
import { getAiIndexDetailPath } from '../paths';
import { CreateAiIndexButton } from './create_ai_index_button';

const SKELETON_CARD_COUNT = 3;

const AiIndexCard = ({ aiIndex, href }: { aiIndex: AiIndexHttpItem; href: string }) => {
  const { euiTheme } = useEuiTheme();

  const sourcesLabel = i18n.translate('xpack.contextEngine.landing.card.sourcesCount', {
    defaultMessage: '{count, plural, one {# source} other {# sources}}',
    values: { count: aiIndex.sources.length },
  });

  const automationsLabel = i18n.translate('xpack.contextEngine.landing.card.automationsCount', {
    defaultMessage: '{count, plural, one {# automation} other {# automations}}',
    values: { count: aiIndex.automations.length },
  });

  return (
    <EuiCard
      data-test-subj="contextAiIndexCard"
      textAlign="left"
      titleSize="xs"
      paddingSize="l"
      title={aiIndex.name}
      href={href}
      footer={
        <>
          <EuiHorizontalRule margin="m" />
          <EuiText size="xs" color="subdued" data-test-subj="contextAiIndexCardUpdated">
            <FormattedMessage
              id="xpack.contextEngine.landing.card.updated"
              defaultMessage="Updated {time}"
              values={{ time: <FormattedRelative value={aiIndex.date_modified} /> }}
            />
          </EuiText>
        </>
      }
    >
      <EuiFlexGroup
        gutterSize="s"
        wrap
        responsive={false}
        css={css`
          margin-block-start: ${euiTheme.size.s};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" iconType="documents" data-test-subj="contextAiIndexCardSources">
            {sourcesLabel}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" iconType="gear" data-test-subj="contextAiIndexCardAutomations">
            {automationsLabel}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCard>
  );
};

export const AiIndexCards = () => {
  const { createContextEngineUrl } = useNavigation();
  const { aiIndices, isLoading, error } = useListAiIndices();

  if (isLoading) {
    return (
      <EuiFlexGrid columns={3} gutterSize="l">
        {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
          <EuiSkeletonRectangle
            key={index}
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
            {i18n.translate('xpack.contextEngine.landing.errorTitle', {
              defaultMessage: 'Unable to load AI Indexes',
            })}
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
            {i18n.translate('xpack.contextEngine.landing.emptyTitle', {
              defaultMessage: 'No AI Indexes yet',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.contextEngine.landing.emptyBody', {
              defaultMessage:
                'Create an AI Index to organize and retrieve contextual knowledge for your agents.',
            })}
          </p>
        }
        actions={<CreateAiIndexButton />}
      />
    );
  }

  return (
    <EuiFlexGrid columns={3} gutterSize="l">
      {aiIndices.map((aiIndex) => (
        <AiIndexCard
          key={aiIndex.id}
          aiIndex={aiIndex}
          href={createContextEngineUrl(getAiIndexDetailPath(aiIndex.id))}
        />
      ))}
    </EuiFlexGrid>
  );
};
