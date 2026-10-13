/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonGroup,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHealth,
  EuiPanel,
  EuiProgress,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React, { useEffect, useMemo, useState } from 'react';
import {
  COST_TIERS,
  DEFAULT_COST_TIER,
  MAX_MONTHLY_BUDGET_USD,
  type AiIndexBudget,
  type BucketBudgetStatus,
  type BudgetBucket,
  type BudgetState,
  type CostTier,
} from '../../../../common/budgets';
import { useAiIndexBudget, useSaveAiIndexBudget } from '../../hooks/use_ai_index_budget';
import {
  formatResetDate,
  formatTokens,
  formatUsd,
  getEffectiveBudgetState,
  getGoverningLimit,
} from '../../utils/budgets';
import { AiIndexDetailPanelDescription } from './ai_index_detail_panel_description';

const BUCKET_LABELS: Record<BudgetBucket, string> = {
  automations: i18n.translate('xpack.contextEngine.aiIndexDetail.budget.automationsLabel', {
    defaultMessage: 'Automation runs',
  }),
  suggestions: i18n.translate('xpack.contextEngine.aiIndexDetail.budget.suggestionsLabel', {
    defaultMessage: 'Automation suggestions',
  }),
};

const LIMIT_FIELDS: Record<BudgetBucket, 'automations_monthly_usd' | 'suggestions_monthly_usd'> = {
  automations: 'automations_monthly_usd',
  suggestions: 'suggestions_monthly_usd',
};

const STATE_COLORS: Record<BudgetState, string> = {
  unlimited: 'subdued',
  ok: 'success',
  warning: 'warning',
  exhausted: 'danger',
};

const PROGRESS_COLORS: Record<BudgetState, 'primary' | 'success' | 'warning' | 'danger'> = {
  unlimited: 'primary',
  ok: 'success',
  warning: 'warning',
  exhausted: 'danger',
};

const STATE_LABELS: Record<BudgetState, string> = {
  unlimited: i18n.translate('xpack.contextEngine.aiIndexDetail.budget.state.unlimited', {
    defaultMessage: 'No limit',
  }),
  ok: i18n.translate('xpack.contextEngine.aiIndexDetail.budget.state.ok', {
    defaultMessage: 'Within budget',
  }),
  warning: i18n.translate('xpack.contextEngine.aiIndexDetail.budget.state.warning', {
    defaultMessage: 'Nearly spent',
  }),
  exhausted: i18n.translate('xpack.contextEngine.aiIndexDetail.budget.state.exhausted', {
    defaultMessage: 'Paused',
  }),
};

const COST_TIER_OPTIONS: Array<{ id: CostTier; label: string }> = COST_TIERS.map((tier) => ({
  id: tier,
  label: {
    cheap: i18n.translate('xpack.contextEngine.aiIndexDetail.budget.tier.cheap', {
      defaultMessage: 'Cheap',
    }),
    medium: i18n.translate('xpack.contextEngine.aiIndexDetail.budget.tier.medium', {
      defaultMessage: 'Medium',
    }),
    expensive: i18n.translate('xpack.contextEngine.aiIndexDetail.budget.tier.expensive', {
      defaultMessage: 'Expensive',
    }),
  }[tier],
}));

const COST_TIER_HELP: Record<CostTier, string> = {
  cheap: i18n.translate('xpack.contextEngine.aiIndexDetail.budget.tierHelp.cheap', {
    defaultMessage:
      'Suggested automations keep the configured model, prefer steps without model calls, process only new data and run at most daily.',
  }),
  medium: i18n.translate('xpack.contextEngine.aiIndexDetail.budget.tierHelp.medium', {
    defaultMessage: 'Suggested automations use the standard templates and the configured model.',
  }),
  expensive: i18n.translate('xpack.contextEngine.aiIndexDetail.budget.tierHelp.expensive', {
    defaultMessage:
      'Suggested automations may use larger models and run more often where the data changes quickly.',
  }),
};

type LimitDrafts = Record<BudgetBucket, string>;

const toDrafts = (config: AiIndexBudget): LimitDrafts => ({
  automations: config.automations_monthly_usd?.toString() ?? '',
  suggestions: config.suggestions_monthly_usd?.toString() ?? '',
});

const parseLimit = (draft: string): number | undefined | null => {
  if (draft.trim() === '') {
    return undefined;
  }
  const value = Number(draft);
  return Number.isFinite(value) && value >= 0 && value <= MAX_MONTHLY_BUDGET_USD ? value : null;
};

const SpendLine = ({ scope, status }: { scope: string; status: BucketBudgetStatus }) => {
  const { limit_usd: limitUsd, spend } = status;
  return (
    <EuiText size="xs" color="subdued">
      {limitUsd === undefined
        ? i18n.translate('xpack.contextEngine.aiIndexDetail.budget.spendNoLimit', {
            defaultMessage: '{scope}: {spent} spent, no limit',
            values: { scope, spent: formatUsd(spend.cost_usd) },
          })
        : i18n.translate('xpack.contextEngine.aiIndexDetail.budget.spendOfLimit', {
            defaultMessage: '{scope}: {spent} of {limit}',
            values: { scope, spent: formatUsd(spend.cost_usd), limit: formatUsd(limitUsd) },
          })}
    </EuiText>
  );
};

const BucketSummary = ({
  bucket,
  aiIndex,
  space,
}: {
  bucket: BudgetBucket;
  aiIndex: BucketBudgetStatus;
  space: BucketBudgetStatus;
}) => {
  const governing = getGoverningLimit(aiIndex, space);
  const state = getEffectiveBudgetState(aiIndex, space);
  const { tokens, unpriced_tokens: unpricedTokens } = aiIndex.spend;
  const totalTokens = tokens.input_tokens + tokens.output_tokens;

  return (
    <div data-test-subj={`contextAiIndexBudget-${bucket}`}>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{BUCKET_LABELS[bucket]}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth
            color={STATE_COLORS[state]}
            data-test-subj={`contextAiIndexBudgetState-${bucket}`}
          >
            {STATE_LABELS[state]}
          </EuiHealth>
        </EuiFlexItem>
      </EuiFlexGroup>
      {governing?.limit_usd !== undefined && (
        <EuiProgress
          size="s"
          value={Math.min(governing.spend.cost_usd, governing.limit_usd)}
          max={governing.limit_usd}
          color={PROGRESS_COLORS[state]}
        />
      )}
      <EuiSpacer size="xs" />
      <SpendLine
        scope={i18n.translate('xpack.contextEngine.aiIndexDetail.budget.scopeIndex', {
          defaultMessage: 'This AI index',
        })}
        status={aiIndex}
      />
      <SpendLine
        scope={i18n.translate('xpack.contextEngine.aiIndexDetail.budget.scopeSpace', {
          defaultMessage: 'All AI indices in this space',
        })}
        status={space}
      />
      <EuiText size="xs" color="subdued">
        {unpricedTokens > 0
          ? i18n.translate('xpack.contextEngine.aiIndexDetail.budget.tokensWithUnpriced', {
              defaultMessage: '{total} tokens, {unpriced} from models without a known price',
              values: { total: formatTokens(totalTokens), unpriced: formatTokens(unpricedTokens) },
            })
          : i18n.translate('xpack.contextEngine.aiIndexDetail.budget.tokens', {
              defaultMessage: '{total} tokens',
              values: { total: formatTokens(totalTokens) },
            })}
      </EuiText>
    </div>
  );
};

interface BudgetPanelProps {
  aiIndexId: string | undefined;
}

/** Month-to-date AI spend of the AI index, with its own limits and cost tier. */
export const BudgetPanel = ({ aiIndexId }: BudgetPanelProps) => {
  const { budget, isLoading, error } = useAiIndexBudget(aiIndexId);
  const { mutate: saveBudget, isLoading: isSaving } = useSaveAiIndexBudget(aiIndexId ?? '');

  const [drafts, setDrafts] = useState<LimitDrafts>({ automations: '', suggestions: '' });
  const [costTier, setCostTier] = useState<CostTier>(DEFAULT_COST_TIER);

  useEffect(() => {
    if (budget) {
      setDrafts(toDrafts(budget.config));
      setCostTier(budget.cost_tier);
    }
  }, [budget]);

  const parsed = useMemo(
    () => ({
      automations: parseLimit(drafts.automations),
      suggestions: parseLimit(drafts.suggestions),
    }),
    [drafts]
  );
  const isValid = parsed.automations !== null && parsed.suggestions !== null;
  const isDirty =
    budget !== undefined &&
    (drafts.automations !== toDrafts(budget.config).automations ||
      drafts.suggestions !== toDrafts(budget.config).suggestions ||
      costTier !== budget.cost_tier);

  const handleSave = () => {
    const { automations, suggestions } = parsed;
    if (automations === null || suggestions === null) {
      return;
    }
    saveBudget({
      ...(automations !== undefined && { automations_monthly_usd: automations }),
      ...(suggestions !== undefined && { suggestions_monthly_usd: suggestions }),
      cost_tier: costTier,
    });
  };

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextAiIndexBudgetPanel">
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.budget.title', {
            defaultMessage: 'AI budget',
          })}
        </h2>
      </EuiTitle>
      <AiIndexDetailPanelDescription>
        {budget
          ? i18n.translate('xpack.contextEngine.aiIndexDetail.budget.descriptionWithReset', {
              defaultMessage:
                'Monthly limits on what AI models spend for this AI index. New work stops when a limit is reached, and resumes on {resetDate}.',
              values: { resetDate: formatResetDate(budget.period.end) },
            })
          : i18n.translate('xpack.contextEngine.aiIndexDetail.budget.description', {
              defaultMessage:
                'Monthly limits on what AI models spend for this AI index. New work stops when a limit is reached.',
            })}
      </AiIndexDetailPanelDescription>
      <EuiSpacer size="m" />
      {error ? (
        <KbnWarningCallout
          announceOnMount
          size="s"
          title={i18n.translate('xpack.contextEngine.aiIndexDetail.budget.loadError', {
            defaultMessage: 'Unable to load the budget',
          })}
          data-test-subj="contextAiIndexBudgetError"
        >
          {error.message}
        </KbnWarningCallout>
      ) : isLoading || !budget ? (
        <EuiSkeletonText lines={3} data-test-subj="contextAiIndexBudgetLoading" />
      ) : (
        <>
          {budget.pricing.source === 'unavailable' && (
            <>
              <KbnWarningCallout
                announceOnMount
                size="s"
                title={i18n.translate(
                  'xpack.contextEngine.aiIndexDetail.budget.pricesUnavailable',
                  {
                    defaultMessage:
                      'Model prices are unavailable, so spend cannot be estimated and limits are not enforced. Token counts are still reported.',
                  }
                )}
                data-test-subj="contextAiIndexBudgetPricesUnavailable"
              />
              <EuiSpacer size="m" />
            </>
          )}
          <EuiFlexGroup gutterSize="l">
            {(['automations', 'suggestions'] as const).map((bucket) => (
              <EuiFlexItem key={bucket}>
                <BucketSummary
                  bucket={bucket}
                  aiIndex={budget.ai_index[bucket]}
                  space={budget.space[bucket]}
                />
                <EuiSpacer size="s" />
                <EuiFormRow
                  label={i18n.translate('xpack.contextEngine.aiIndexDetail.budget.limitLabel', {
                    defaultMessage: 'Monthly limit for this AI index',
                  })}
                  helpText={i18n.translate('xpack.contextEngine.aiIndexDetail.budget.limitHelp', {
                    defaultMessage: 'Leave empty or set to 0 to apply only the space limit.',
                  })}
                  isInvalid={parsed[bucket] === null}
                  fullWidth
                >
                  <EuiFieldNumber
                    compressed
                    fullWidth
                    min={0}
                    max={MAX_MONTHLY_BUDGET_USD}
                    step={0.01}
                    prepend="$"
                    value={drafts[bucket]}
                    isInvalid={parsed[bucket] === null}
                    onChange={(event) =>
                      setDrafts((previous) => ({ ...previous, [bucket]: event.target.value }))
                    }
                    data-test-subj={`contextAiIndexBudgetLimit-${LIMIT_FIELDS[bucket]}`}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('xpack.contextEngine.aiIndexDetail.budget.tierLabel', {
              defaultMessage: 'Cost tier for suggested automations',
            })}
            helpText={COST_TIER_HELP[costTier]}
            fullWidth
          >
            <EuiButtonGroup
              buttonSize="compressed"
              legend={i18n.translate('xpack.contextEngine.aiIndexDetail.budget.tierLegend', {
                defaultMessage: 'Cost tier',
              })}
              options={COST_TIER_OPTIONS}
              idSelected={costTier}
              onChange={(id) =>
                setCostTier(COST_TIERS.find((tier) => tier === id) ?? DEFAULT_COST_TIER)
              }
              data-test-subj="contextAiIndexBudgetCostTier"
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiButton
            size="s"
            onClick={handleSave}
            isDisabled={!isDirty || !isValid}
            isLoading={isSaving}
            data-test-subj="contextAiIndexBudgetSave"
          >
            {i18n.translate('xpack.contextEngine.aiIndexDetail.budget.save', {
              defaultMessage: 'Save budget',
            })}
          </EuiButton>
        </>
      )}
    </EuiPanel>
  );
};
