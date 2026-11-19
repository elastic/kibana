/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSkeletonText, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React from 'react';
import type { AiIndexSpendResponse } from '../../../../common/spend';
import { useAiIndexSpend } from '../../hooks/use_ai_index_spend';
import { formatPeriodStart, formatTokens, formatUsd } from '../../utils/spend';
import { AiIndexDetailPanelDescription } from './ai_index_detail_panel_description';

const SpendSummary = ({ spend }: { spend: AiIndexSpendResponse }) => {
  const { ai_index: aiIndex, space } = spend;
  const totalTokens = aiIndex.tokens.input_tokens + aiIndex.tokens.output_tokens;

  return (
    <div data-test-subj="contextAiIndexSpendSummary">
      <EuiText size="s">
        <strong>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.spend.aiIndexSpend', {
            defaultMessage: 'This AI index: {spent}',
            values: { spent: formatUsd(aiIndex.cost_usd) },
          })}
        </strong>
      </EuiText>
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.contextEngine.aiIndexDetail.spend.spaceSpend', {
          defaultMessage: 'All AI indices in this space: {spent}',
          values: { spent: formatUsd(space.cost_usd) },
        })}
      </EuiText>
      <EuiText size="xs" color="subdued">
        {aiIndex.unpriced_tokens > 0
          ? i18n.translate('xpack.contextEngine.aiIndexDetail.spend.tokensWithUnpriced', {
              defaultMessage: '{total} tokens, {unpriced} from models without a known price',
              values: {
                total: formatTokens(totalTokens),
                unpriced: formatTokens(aiIndex.unpriced_tokens),
              },
            })
          : i18n.translate('xpack.contextEngine.aiIndexDetail.spend.tokens', {
              defaultMessage: '{total} tokens',
              values: { total: formatTokens(totalTokens) },
            })}
      </EuiText>
    </div>
  );
};

interface SpendPanelProps {
  aiIndexId: string | undefined;
}

/** Month-to-date AI spend of the AI index's automation runs, next to the space total. */
export const SpendPanel = ({ aiIndexId }: SpendPanelProps) => {
  const { spend, isLoading, error } = useAiIndexSpend(aiIndexId);

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextAiIndexSpendPanel">
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.spend.title', {
            defaultMessage: 'AI spend',
          })}
        </h2>
      </EuiTitle>
      <AiIndexDetailPanelDescription>
        {spend
          ? i18n.translate('xpack.contextEngine.aiIndexDetail.spend.descriptionWithPeriod', {
              defaultMessage:
                'Estimated cost of the AI models this AI index’s automations used since {periodStart}.',
              values: { periodStart: formatPeriodStart(spend.period.start) },
            })
          : i18n.translate('xpack.contextEngine.aiIndexDetail.spend.description', {
              defaultMessage:
                'Estimated cost of the AI models this AI index’s automations used this month.',
            })}
      </AiIndexDetailPanelDescription>
      <EuiSpacer size="m" />
      {error ? (
        <KbnWarningCallout
          announceOnMount
          size="s"
          title={i18n.translate('xpack.contextEngine.aiIndexDetail.spend.loadError', {
            defaultMessage: 'Unable to load the AI spend',
          })}
          data-test-subj="contextAiIndexSpendError"
        >
          {error.message}
        </KbnWarningCallout>
      ) : isLoading || !spend ? (
        <EuiSkeletonText lines={3} data-test-subj="contextAiIndexSpendLoading" />
      ) : (
        <>
          {spend.pricing.source === 'unavailable' && (
            <>
              <KbnWarningCallout
                announceOnMount
                size="s"
                title={i18n.translate('xpack.contextEngine.aiIndexDetail.spend.pricesUnavailable', {
                  defaultMessage:
                    'Model prices are unavailable, so spend cannot be estimated. Token counts are still reported.',
                })}
                data-test-subj="contextAiIndexSpendPricesUnavailable"
              />
              <EuiSpacer size="m" />
            </>
          )}
          <SpendSummary spend={spend} />
        </>
      )}
    </EuiPanel>
  );
};
