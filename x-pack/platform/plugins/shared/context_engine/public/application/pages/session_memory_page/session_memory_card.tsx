/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import React from 'react';
import type { SessionMemory } from '../../../../common/http_api/session_memory';
import { getImagePreviewSrc } from './media_file';

const imageAlt = i18n.translate('xpack.contextEngine.sessionMemory.card.imageAlt', {
  defaultMessage: 'Image memory preview',
});

const pdfLabel = i18n.translate('xpack.contextEngine.sessionMemory.card.pdf', {
  defaultMessage: 'PDF',
});

const scoreLabel = i18n.translate('xpack.contextEngine.sessionMemory.card.score', {
  defaultMessage: 'Score',
});

interface SessionMemoryCardProps {
  memory: SessionMemory;
  /** Search relevance; the meter is relative to `maxScore` so the best hit fills it. */
  score?: number;
  maxScore?: number;
  'data-test-subj': string;
}

/** A stored memory: its image or document thumbnail, type, text, age, and (for a search hit) score. */
export const SessionMemoryCard = ({
  memory,
  score,
  maxScore,
  'data-test-subj': dataTestSubj,
}: SessionMemoryCardProps) => {
  const imageSrc = getImagePreviewSrc(memory.media);
  const hasPdf = memory.media?.some(({ type }) => type === 'pdf') ?? false;

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={dataTestSubj}>
      {score !== undefined && (
        <>
          <EuiProgress
            size="s"
            color="primary"
            value={score}
            max={maxScore && maxScore > 0 ? maxScore : 1}
            label={scoreLabel}
            valueText={<span data-test-subj={`${dataTestSubj}-score`}>{score.toFixed(3)}</span>}
          />
          <EuiSpacer size="s" />
        </>
      )}
      <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          {imageSrc ? (
            <EuiImage
              src={imageSrc}
              alt={imageAlt}
              size="m"
              hasShadow
              allowFullScreen
              data-test-subj={`${dataTestSubj}-image`}
            />
          ) : (
            <EuiPanel color="subdued" paddingSize="m" hasShadow={false}>
              <EuiIcon
                type={hasPdf ? 'document' : 'editorComment'}
                size="xl"
                color="subdued"
                aria-hidden={true}
              />
            </EuiPanel>
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {memory.type && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="primary" data-test-subj={`${dataTestSubj}-type`}>
                  {memory.type}
                </EuiBadge>
              </EuiFlexItem>
            )}
            {hasPdf && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" iconType="document">
                  {pdfLabel}
                </EuiBadge>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" iconType="user">
                {memory.user_id}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" iconType="machineLearningApp">
                {memory.agent_id}
              </EuiBadge>
            </EuiFlexItem>
            {memory.ai_index_id?.map((aiIndexId) => (
              <EuiFlexItem grow={false} key={aiIndexId}>
                <EuiBadge color="hollow" iconType="table">
                  {aiIndexId}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          {memory.content && (
            <>
              <EuiSpacer size="s" />
              <EuiText size="s" data-test-subj={`${dataTestSubj}-content`}>
                <p>{memory.content}</p>
              </EuiText>
            </>
          )}
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <FormattedRelative value={memory['@timestamp']} /> · {memory.session_id}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
