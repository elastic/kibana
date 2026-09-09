/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING } from '@kbn/management-settings-ids';
import {
  COST_BUDGET_GROUPS,
  type BudgetGroupCost,
  type CostBudgetGroup,
  type CostCaveat,
  type CostResponse,
  type PeriodCost,
  type TokenTrackingCoverage,
} from '@kbn/significant-events-plugin/common';
import { useKibana } from '../../../../hooks/use_kibana';
import { useSignificantEventsCost } from '../../../../hooks/use_significant_events_cost';
import { useRunQuotas } from '../../../../hooks/use_significant_events_run_quotas';
import { getFormattedError } from '../../../../util/errors';

const PRICING_URL =
  'https://cloud.elastic.co/cloud-pricing-table?productType=serverless&solution=elasticsearch';
const INSTALL_TOKEN_USAGE_DASHBOARD_URL = '/internal/gen_ai_settings/install_token_usage_dashboard';

type DisplayedCostCaveat = Exclude<CostCaveat, 'usd_assumed'>;

const DEFAULT_DISPLAYED_CAVEATS: readonly DisplayedCostCaveat[] = [
  'eis_pricing_assumed',
  'excludes_embeddings',
  'excludes_failed_calls',
  'excludes_cache_writes',
  'tracking_not_all_spaces',
];

const isDisplayedCostCaveat = (caveat: CostCaveat): caveat is DisplayedCostCaveat =>
  caveat !== 'usd_assumed';

const GROUP_LABELS: Record<CostBudgetGroup, string> = {
  discovery: i18n.translate('xpack.significantEventsApp.settings.costEstimate.discoveryRowTitle', {
    defaultMessage: 'Discovery',
  }),
  investigation: i18n.translate(
    'xpack.significantEventsApp.settings.costEstimate.investigationRowTitle',
    { defaultMessage: 'Investigation' }
  ),
  ki_extraction: i18n.translate(
    'xpack.significantEventsApp.settings.costEstimate.kiExtractionRowTitle',
    { defaultMessage: 'KI extraction' }
  ),
  memory: i18n.translate('xpack.significantEventsApp.settings.costEstimate.memoryRowTitle', {
    defaultMessage: 'Memory',
  }),
};

const formatUsd = (value: number): string => `~$${value.toFixed(2)}`;

const formatCostValue = (totalTokens: number, estimatedCost: number | null): string => {
  if (totalTokens === 0) {
    return i18n.translate('xpack.significantEventsApp.settings.costEstimate.noRecordedCallsLabel', {
      defaultMessage: 'No recorded calls',
    });
  }
  if (estimatedCost === null) {
    return i18n.translate(
      'xpack.significantEventsApp.settings.costEstimate.unableToCalculateLabel',
      { defaultMessage: 'Unable to calculate' }
    );
  }
  return formatUsd(estimatedCost);
};

const caveatText = (caveat: DisplayedCostCaveat, tierCrossingCount: number): string => {
  switch (caveat) {
    case 'eis_pricing_assumed':
      return i18n.translate(
        'xpack.significantEventsApp.settings.costEstimate.eisPricingAssumedDescription',
        {
          defaultMessage: 'Prices are based on Elastic Inference Service list rates.',
        }
      );
    case 'excludes_embeddings':
      return i18n.translate(
        'xpack.significantEventsApp.settings.costEstimate.excludesEmbeddingsDescription',
        { defaultMessage: 'Embedding and rerank inference is excluded.' }
      );
    case 'excludes_failed_calls':
      return i18n.translate(
        'xpack.significantEventsApp.settings.costEstimate.excludesFailedCallsDescription',
        {
          defaultMessage: 'Calls that fail before token usage is recorded are excluded.',
        }
      );
    case 'excludes_cache_writes':
      return i18n.translate(
        'xpack.significantEventsApp.settings.costEstimate.excludesCacheWritesDescription',
        {
          defaultMessage: 'Cache-write tokens are excluded because Kibana does not record them.',
        }
      );
    case 'tracking_not_all_spaces':
      return i18n.translate(
        'xpack.significantEventsApp.settings.costEstimate.trackingNotAllSpacesDescription',
        {
          defaultMessage:
            'Token tracking is not enabled in every space. Calls made while tracking was disabled are not included.',
        }
      );
    case 'prices_stale':
      return i18n.translate(
        'xpack.significantEventsApp.settings.costEstimate.pricesStaleDescription',
        {
          defaultMessage: 'Price data is outdated; estimates may not reflect current rates.',
        }
      );
    case 'tier_crossings_detected':
      return i18n.translate(
        'xpack.significantEventsApp.settings.costEstimate.tierCrossingsDetectedDescription',
        {
          defaultMessage:
            'Estimate uses lower-tier pricing; {count, plural, one {# call exceeded} other {# calls exceeded}} the tier threshold.',
          values: { count: tierCrossingCount },
        }
      );
  }
};

const CostDetailsTooltip = ({ data }: { data?: CostResponse }) => {
  const caveats = data ? data.caveats.filter(isDisplayedCostCaveat) : DEFAULT_DISPLAYED_CAVEATS;
  const monthTierCrossings =
    data?.month.groups.reduce((sum, group) => sum + group.tierCrossingCount, 0) ?? 0;
  const ariaLabel = i18n.translate(
    'xpack.significantEventsApp.settings.costEstimate.detailsTooltipAriaLabel',
    { defaultMessage: 'Cost estimate details' }
  );

  return (
    <EuiIconTip
      aria-label={ariaLabel}
      type="info"
      color="subdued"
      size="s"
      anchorProps={{
        'data-test-subj': 'significantEventsCostDetailsTooltip',
      }}
      content={
        <EuiText size="xs">
          <ul data-test-subj="significantEventsCostDetails">
            {caveats.map((caveat) => (
              <li key={caveat}>{caveatText(caveat, monthTierCrossings)}</li>
            ))}
          </ul>
        </EuiText>
      }
    />
  );
};

const CoverageBadge = ({ coverage }: { coverage: TokenTrackingCoverage }) => {
  const label =
    coverage.status === 'unavailable'
      ? i18n.translate(
          'xpack.significantEventsApp.settings.costEstimate.trackingCoverageUnavailableLabel',
          { defaultMessage: 'Tracking coverage unavailable' }
        )
      : i18n.translate(
          'xpack.significantEventsApp.settings.costEstimate.trackingCoverageBadgeLabel',
          {
            defaultMessage:
              '{enabled} of {total} {total, plural, one {space} other {spaces}} tracked',
            values: {
              enabled: coverage.enabledSpaceCount,
              total: coverage.totalSpaceCount,
            },
          }
        );

  return (
    <EuiBadge
      color={
        coverage.status === 'full'
          ? 'success'
          : coverage.status === 'partial'
          ? 'warning'
          : 'hollow'
      }
      data-test-subj="significantEventsTokenTrackingCoverage"
    >
      {label}
    </EuiBadge>
  );
};

const CostHeaderActions = ({ data }: { data?: CostResponse }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <CostDetailsTooltip data={data} />
      </EuiFlexItem>
      {data ? (
        <EuiFlexItem grow={false}>
          <CoverageBadge coverage={data.trackingCoverage} />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

const CostValue = ({
  period,
  group,
  testSubj,
}: {
  period: PeriodCost;
  group: BudgetGroupCost;
  testSubj: string;
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <span data-test-subj={testSubj}>
        {formatCostValue(group.totalTokens, group.estimatedCost)}
      </span>
    </EuiFlexItem>
    {group.status === 'partial' && group.estimatedCost !== null && (
      <EuiFlexItem grow={false}>
        <EuiBadge
          color="warning"
          data-test-subj={`significantEventsCostPartialBadge-${group.group}-${period.label}`}
        >
          {i18n.translate('xpack.significantEventsApp.settings.costEstimate.partialFloorBadge', {
            defaultMessage: 'Partial floor',
          })}
        </EuiBadge>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

const CostData = ({
  data,
  isRefreshing,
  onRefresh,
}: {
  data: CostResponse;
  isRefreshing: boolean;
  onRefresh: () => void;
}) => {
  const asOfTime = new Date(data.asOf).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const todayText = formatCostValue(data.today.totalTokens, data.today.totalEstimatedCost);
  const monthText = formatCostValue(data.month.totalTokens, data.month.totalEstimatedCost);
  const headline = i18n.translate(
    'xpack.significantEventsApp.settings.costEstimate.headlineLabel',
    {
      defaultMessage: '{today} today · {month} this month (recorded calls)',
      values: { today: todayText, month: monthText },
    }
  );

  return (
    <>
      <EuiFlexGroup alignItems="flexStart" justifyContent="spaceBetween" gutterSize="m">
        <EuiFlexItem>
          <EuiText size="s">
            <p data-test-subj="significantEventsCostHeadline">{headline}</p>
          </EuiText>
          <EuiText size="xs" color="subdued">
            <p data-test-subj="significantEventsCostAsOf">
              <FormattedMessage
                id="xpack.significantEventsApp.settings.costEstimate.asOfLabel"
                defaultMessage="as of {asOf} at <pricingLink>current list prices</pricingLink>"
                values={{
                  asOf: asOfTime,
                  pricingLink: (chunks) => (
                    <EuiLink
                      href={PRICING_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      external
                      data-test-subj="significantEventsCostPricingLink"
                    >
                      {chunks}
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="refresh"
            isLoading={isRefreshing}
            isDisabled={isRefreshing}
            onClick={onRefresh}
            data-test-subj="significantEventsCostRefreshButton"
          >
            {i18n.translate('xpack.significantEventsApp.settings.costEstimate.refreshButtonLabel', {
              defaultMessage: 'Refresh',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText size="xs">
            <strong>
              {i18n.translate('xpack.significantEventsApp.settings.costEstimate.groupColumnTitle', {
                defaultMessage: 'Group',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            <strong>
              {i18n.translate('xpack.significantEventsApp.settings.costEstimate.todayColumnTitle', {
                defaultMessage: 'Today',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            <strong>
              {i18n.translate(
                'xpack.significantEventsApp.settings.costEstimate.thisMonthColumnTitle',
                { defaultMessage: 'This month' }
              )}
            </strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {COST_BUDGET_GROUPS.map((groupName) => {
        const todayGroup = data.today.groups.find((group) => group.group === groupName);
        const monthGroup = data.month.groups.find((group) => group.group === groupName);
        if (!todayGroup || !monthGroup) {
          return null;
        }
        return (
          <EuiFlexGroup
            key={groupName}
            alignItems="center"
            data-test-subj={`significantEventsCostGroup-${groupName}`}
          >
            <EuiFlexItem>
              <EuiText size="s">{GROUP_LABELS[groupName]}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <CostValue
                period={data.today}
                group={todayGroup}
                testSubj={`significantEventsCostGroupToday-${groupName}`}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <CostValue
                period={data.month}
                group={monthGroup}
                testSubj={`significantEventsCostGroupMonth-${groupName}`}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      })}
    </>
  );
};

const TrackingCoverageCallout = ({ coverage }: { coverage: TokenTrackingCoverage }) => {
  if (coverage.status === 'full' || coverage.status === 'none') {
    return null;
  }

  const title =
    coverage.status === 'unavailable'
      ? i18n.translate(
          'xpack.significantEventsApp.settings.costEstimate.trackingCoverageUnavailableTitle',
          { defaultMessage: 'Unable to determine token tracking coverage' }
        )
      : i18n.translate(
          'xpack.significantEventsApp.settings.costEstimate.trackingCoveragePartialTitle',
          {
            defaultMessage:
              'Token tracking is enabled in {enabled} of {total} {total, plural, one {space} other {spaces}}',
            values: {
              enabled: coverage.enabledSpaceCount,
              total: coverage.totalSpaceCount,
            },
          }
        );

  return (
    <EuiCallOut
      color="warning"
      iconType="info"
      title={title}
      data-test-subj="significantEventsTrackingCoverageCallout"
    >
      <p>
        {i18n.translate(
          'xpack.significantEventsApp.settings.costEstimate.trackingCoverageDescription',
          {
            defaultMessage:
              'This deployment-wide estimate includes all Significant Events calls recorded during the selected period. Calls made while tracking was disabled are not included.',
          }
        )}
      </p>
    </EuiCallOut>
  );
};

const EnableTrackingButton = ({
  canSaveAdvancedSettings,
  isEnablingTracking,
  onEnable,
}: {
  canSaveAdvancedSettings: boolean;
  isEnablingTracking: boolean;
  onEnable: () => void;
}) => (
  <EuiToolTip
    content={
      canSaveAdvancedSettings
        ? undefined
        : i18n.translate(
            'xpack.significantEventsApp.settings.costEstimate.enableTrackingPermissionTooltip',
            {
              defaultMessage:
                'You need permission to save Advanced Settings before you can enable token tracking.',
            }
          )
    }
  >
    <EuiButton
      fill
      isLoading={isEnablingTracking}
      isDisabled={!canSaveAdvancedSettings}
      onClick={onEnable}
      data-test-subj="significantEventsEnableTokenTrackingButton"
    >
      {i18n.translate(
        'xpack.significantEventsApp.settings.costEstimate.enableTrackingButtonLabel',
        { defaultMessage: 'Enable token tracking in this space' }
      )}
    </EuiButton>
  </EuiToolTip>
);

const RetryCallout = ({
  title,
  body,
  onRetry,
}: {
  title: string;
  body?: string;
  onRetry: () => void;
}) => (
  <EuiCallOut announceOnMount color="danger" iconType="error" title={title}>
    {body ? <p>{body}</p> : null}
    <EuiButton size="s" onClick={onRetry} data-test-subj="significantEventsCostRetryButton">
      {i18n.translate('xpack.significantEventsApp.settings.costEstimate.retryButtonLabel', {
        defaultMessage: 'Retry',
      })}
    </EuiButton>
  </EuiCallOut>
);

export const CostEstimate = () => {
  const quotas = useRunQuotas();
  const [isEnablingTracking, setIsEnablingTracking] = useState(false);
  const { core } = useKibana();
  const settingsClient = core.settings.client;
  const tracking$ = useMemo(
    () => settingsClient.get$<boolean>(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING, false),
    [settingsClient]
  );
  const trackingEnabled = useObservable(
    tracking$,
    settingsClient.get<boolean>(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING, false)
  );
  const canManage = quotas.data?.canManage === true;
  const canSaveAdvancedSettings = core.application.capabilities.advancedSettings?.save === true;
  const cost = useSignificantEventsCost({
    enabled: canManage,
  });

  const enableTokenTracking = async (): Promise<void> => {
    setIsEnablingTracking(true);
    let updateError: Error | undefined;
    const updateErrorSubscription = settingsClient.getUpdateErrors$().subscribe((error) => {
      updateError = error;
    });

    try {
      const wasSaved = await settingsClient.set(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING, true);
      if (!wasSaved) {
        throw (
          updateError ??
          new Error(
            i18n.translate(
              'xpack.significantEventsApp.settings.costEstimate.enableTrackingFailedErrorMessage',
              { defaultMessage: 'The token tracking setting could not be saved.' }
            )
          )
        );
      }

      try {
        await core.http.post(INSTALL_TOKEN_USAGE_DASHBOARD_URL);
      } catch (error) {
        core.notifications.toasts.addWarning({
          title: i18n.translate(
            'xpack.significantEventsApp.settings.costEstimate.installDashboardFailedTitle',
            {
              defaultMessage:
                'Token tracking was enabled, but the token usage dashboard could not be installed',
            }
          ),
          text: getFormattedError(error).message,
        });
      }
      await cost.refreshCost();
    } catch (error) {
      core.notifications.toasts.addDanger({
        title: i18n.translate(
          'xpack.significantEventsApp.settings.costEstimate.enableTrackingFailedTitle',
          { defaultMessage: 'Unable to enable token tracking' }
        ),
        text: getFormattedError(error).message,
      });
    } finally {
      updateErrorSubscription.unsubscribe();
      setIsEnablingTracking(false);
    }
  };

  if (quotas.isError || quotas.data == null || !canManage) {
    return null;
  }

  const enableAction =
    !trackingEnabled || isEnablingTracking ? (
      <EnableTrackingButton
        canSaveAdvancedSettings={canSaveAdvancedSettings}
        isEnablingTracking={isEnablingTracking}
        onEnable={() => void enableTokenTracking()}
      />
    ) : null;

  const renderWithEnableAction = (content?: React.ReactNode) => (
    <>
      {enableAction}
      {enableAction && content ? <EuiSpacer size="m" /> : null}
      {content}
    </>
  );

  const renderBody = () => {
    if (cost.isLoading && !cost.data) {
      return renderWithEnableAction(
        <EuiLoadingSpinner size="m" data-test-subj="significantEventsCostLoading" />
      );
    }

    if (cost.error) {
      return renderWithEnableAction(
        <RetryCallout
          title={i18n.translate(
            'xpack.significantEventsApp.settings.costEstimate.unavailableErrorTitle',
            { defaultMessage: 'Cost estimate unavailable' }
          )}
          body={getFormattedError(cost.error).message}
          onRetry={() => void cost.retryCost()}
        />
      );
    }

    if (cost.data?.unavailableReason === 'pricing') {
      return renderWithEnableAction(
        <RetryCallout
          title={i18n.translate(
            'xpack.significantEventsApp.settings.costEstimate.pricingUnavailableTitle',
            { defaultMessage: 'Unable to fetch pricing data' }
          )}
          onRetry={() => void cost.retryCost()}
        />
      );
    }

    if (cost.data?.unavailableReason === 'usage_data') {
      return renderWithEnableAction(
        <RetryCallout
          title={i18n.translate(
            'xpack.significantEventsApp.settings.costEstimate.usageDataUnavailableTitle',
            { defaultMessage: 'Unable to read token usage data' }
          )}
          onRetry={() => void cost.retryCost()}
        />
      );
    }

    if (!cost.data) {
      return enableAction;
    }

    if (cost.data.trackingCoverage.status === 'none') {
      return enableAction;
    }

    return (
      <>
        <TrackingCoverageCallout coverage={cost.data.trackingCoverage} />
        {cost.data.trackingCoverage.status === 'partial' ||
        cost.data.trackingCoverage.status === 'unavailable' ? (
          <EuiSpacer size="m" />
        ) : null}
        {renderWithEnableAction(
          <CostData
            data={cost.data}
            isRefreshing={cost.isRefreshing}
            onRefresh={() => void cost.refreshCost()}
          />
        )}
      </>
    );
  };

  return (
    <>
      <EuiSpacer />
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize="none"
        grow={false}
        data-test-subj="significantEventsCostSection"
      >
        <EuiPanel hasShadow={false} color="subdued" paddingSize="none">
          <EuiAccordion
            id="significantEventsCostAccordion"
            initialIsOpen={false}
            buttonProps={{
              paddingSize: 'm',
              css: { flexGrow: 0, inlineSize: 'auto' },
              'data-test-subj': 'significantEventsCostAccordionButton',
            }}
            buttonContent={
              <EuiTitle size="s">
                <h3>
                  {i18n.translate('xpack.significantEventsApp.settings.costEstimate.sectionTitle', {
                    defaultMessage: 'Approximate inference cost across all spaces',
                  })}
                </h3>
              </EuiTitle>
            }
            extraAction={<CostHeaderActions data={cost.data} />}
            data-test-subj="significantEventsCostAccordion"
          >
            <EuiPanel hasShadow={false}>{renderBody()}</EuiPanel>
          </EuiAccordion>
        </EuiPanel>
      </EuiPanel>
    </>
  );
};
