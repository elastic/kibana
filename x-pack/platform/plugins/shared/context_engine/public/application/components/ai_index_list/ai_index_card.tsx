/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBadgeGroup,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  EuiTextBlockTruncate,
} from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import React from 'react';
import type { AiIndexHttpItem } from '../../../../common/http_api/ai_indices';
import { AI_INDEX_TYPE_LABEL } from './labels';

const AiIndexCardFooter = ({ aiIndex }: { aiIndex: AiIndexHttpItem }) => (
  <>
    <EuiHorizontalRule margin="s" />
    <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false} data-test-subj="contextAiIndexCardUpdated">
        <EuiText size="xs" color="subdued" textAlign="right">
          <FormattedMessage
            id="xpack.contextEngine.landing.card.updated"
            defaultMessage="Updated"
          />
        </EuiText>
        <EuiText size="s" textAlign="right">
          <FormattedRelative value={aiIndex.date_modified} />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);

export const AiIndexCard = ({ aiIndex, href }: { aiIndex: AiIndexHttpItem; href: string }) => {
  const footer = aiIndex.managed ? undefined : <AiIndexCardFooter aiIndex={aiIndex} />;

  return (
    <EuiCard
      data-test-subj="contextAiIndexCard"
      textAlign="left"
      titleSize="xs"
      titleElement="h4"
      paddingSize="l"
      title={
        <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
          <EuiFlexItem className="eui-textTruncate">
            <span className="eui-textTruncate">{aiIndex.id}</span>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText
              component="span"
              size="xs"
              color="subdued"
              data-test-subj="contextAiIndexCardType"
            >
              {AI_INDEX_TYPE_LABEL[aiIndex.dest.type]}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      href={href}
      footer={footer}
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        {aiIndex.managed && (
          <EuiFlexItem grow={false}>
            <EuiBadgeGroup gutterSize="s">
              <EuiBadge color="hollow" iconType="lock" data-test-subj="contextAiIndexCardManaged">
                <FormattedMessage
                  id="xpack.contextEngine.landing.card.managed"
                  defaultMessage="Managed"
                />
              </EuiBadge>
            </EuiBadgeGroup>
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" data-test-subj="contextAiIndexCardDescription">
            <EuiTextBlockTruncate lines={2}>{aiIndex.description}</EuiTextBlockTruncate>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiBadgeGroup gutterSize="s">
            <EuiBadge
              color="hollow"
              iconType="documents"
              data-test-subj="contextAiIndexCardSources"
            >
              <FormattedMessage
                id="xpack.contextEngine.landing.card.sourcesCount"
                defaultMessage="{count, plural, one {# source} other {# sources}}"
                values={{ count: aiIndex.sources.length }}
              />
            </EuiBadge>
            <EuiBadge color="hollow" iconType="gear" data-test-subj="contextAiIndexCardAutomations">
              <FormattedMessage
                id="xpack.contextEngine.landing.card.automationsCount"
                defaultMessage="{count, plural, one {# automation} other {# automations}}"
                values={{ count: aiIndex.automations.length }}
              />
            </EuiBadge>
          </EuiBadgeGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCard>
  );
};
