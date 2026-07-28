/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiText,
  EuiTextBlockTruncate,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
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
  const { euiTheme } = useEuiTheme();

  // Managed entries are rewritten on every registration, so their modified date
  // reflects a Kibana restart rather than a user action.
  const footer = aiIndex.managed ? undefined : <AiIndexCardFooter aiIndex={aiIndex} />;

  return (
    <EuiCard
      data-test-subj="contextAiIndexCard"
      textAlign="left"
      titleSize="xs"
      titleElement="h4"
      paddingSize="l"
      title={
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
          <EuiFlexItem
            css={css`
              min-inline-size: 0;
            `}
          >
            <EuiTextBlockTruncate lines={1}>{aiIndex.id}</EuiTextBlockTruncate>
            {aiIndex.managed && (
              <EuiText
                component="span"
                size="xs"
                color="subdued"
                data-test-subj="contextAiIndexCardManaged"
                css={css`
                  display: inline-flex;
                  align-items: center;
                  gap: ${euiTheme.size.xs};
                  margin-block-start: ${euiTheme.size.xxs};
                `}
              >
                <EuiIcon
                  type="lock"
                  size="s"
                  data-test-subj="contextAiIndexCardManagedIcon"
                  aria-hidden={true}
                />
                <FormattedMessage
                  id="xpack.contextEngine.landing.card.managed"
                  defaultMessage="Managed"
                />
              </EuiText>
            )}
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
      css={css`
        block-size: 100%;
        ${aiIndex.managed ? `background-color: ${euiTheme.colors.backgroundBaseSubdued};` : ''}
      `}
      footer={footer}
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiText
            size="s"
            color="subdued"
            data-test-subj="contextAiIndexCardDescription"
            css={css`
              min-block-size: calc(${euiTheme.font.lineHeightMultiplier} * 2em);
            `}
          >
            <EuiTextBlockTruncate lines={2}>{aiIndex.description}</EuiTextBlockTruncate>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" wrap responsive={false}>
            <EuiFlexItem grow={false}>
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
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge
                color="hollow"
                iconType="gear"
                data-test-subj="contextAiIndexCardAutomations"
              >
                <FormattedMessage
                  id="xpack.contextEngine.landing.card.automationsCount"
                  defaultMessage="{count, plural, one {# automation} other {# automations}}"
                  values={{ count: aiIndex.automations.length }}
                />
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCard>
  );
};
