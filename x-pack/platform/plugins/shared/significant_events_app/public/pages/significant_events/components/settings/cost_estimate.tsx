/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  CostFigureResponse,
  RunBudgetGroupId,
  SignificantEventsCostResponse,
} from '@kbn/significant-events-plugin/common';
import {
  useSetSignificantEventsTokenTracking,
  useSignificantEventsCost,
} from '../../../../hooks/use_significant_events_cost';

const formatNumber = (value: number): string =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

type CostDisplayFigure = Pick<CostFigureResponse, 'estimatedCost' | 'coverage'>;

export const formatApproximateCost = ({
  figure,
  currency,
}: {
  figure: CostDisplayFigure;
  currency: SignificantEventsCostResponse['today']['tokenIndex']['currency'];
}): string | undefined => {
  if (
    figure.estimatedCost === null ||
    (figure.estimatedCost === 0 && figure.coverage !== 'complete')
  ) {
    return undefined;
  }
  const formatted = formatNumber(figure.estimatedCost);
  return currency.symbol
    ? `~${currency.symbol}${formatted}`
    : `~${formatted} units per ${currency.unit}`;
};

const billableTokens = (figure: CostFigureResponse): number =>
  figure.tokens.prompt + figure.tokens.completion + figure.tokens.thinking;

const nonEisSourceLabel = (figure: CostFigureResponse): string => {
  if (figure.byoConnectorIds.length > 0 && figure.selfHostedConnectorIds.length > 0) {
    return i18n.translate('xpack.significantEventsApp.cost.mixedNonEisSourceLabel', {
      defaultMessage: 'third-party providers or self-hosted inference',
    });
  }
  return figure.selfHostedConnectorIds.length > 0
    ? i18n.translate('xpack.significantEventsApp.cost.selfHostedSourceLabel', {
        defaultMessage: 'self-hosted inference',
      })
    : i18n.translate('xpack.significantEventsApp.cost.thirdPartySourceLabel', {
        defaultMessage: 'third-party providers',
      });
};

const formatTrackingGapRange = ({ start, end }: { start: string; end: string }): string => {
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return `${formatter.format(new Date(start))} to ${formatter.format(new Date(end))}`;
};

const CostValue = ({
  figure,
  currency,
}: {
  figure: CostDisplayFigure;
  currency: SignificantEventsCostResponse['today']['tokenIndex']['currency'];
}) => {
  const value = formatApproximateCost({ figure, currency });
  if (!value) {
    return (
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.significantEventsApp.cost.unavailableCostLabel', {
            defaultMessage: 'Unable to calculate cost',
          })}
        </p>
      </EuiText>
    );
  }
  return (
    <EuiText size="s">
      <p>{value}</p>
    </EuiText>
  );
};

const WorkflowAttribution = ({
  data,
  groupLabels,
}: {
  data: SignificantEventsCostResponse;
  groupLabels: Record<RunBudgetGroupId, string>;
}) => {
  const currency = data.today.tokenIndex.currency;
  const accordionId = useGeneratedHtmlId({
    prefix: 'significantEventsWorkflowCostAttribution',
  });
  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={i18n.translate('xpack.significantEventsApp.cost.workflowAttributionTitle', {
        defaultMessage: 'Today’s workflow attribution',
      })}
      paddingSize="m"
    >
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate('xpack.significantEventsApp.cost.workflowAttributionDescription', {
            defaultMessage:
              'Workflow-attributed, ai.agent steps only. Knowledge indicator route inference is excluded.',
          })}
        </p>
      </EuiText>
      {RUN_GROUPS.map((group, index) => {
        const attribution = data.today.workflowAttribution.groups[group];
        return (
          <React.Fragment key={group}>
            {index > 0 && <EuiHorizontalRule margin="s" />}
            <EuiText size="s">
              <strong>{groupLabels[group]}</strong>
            </EuiText>
            {attribution.status === 'not_attributable' ? (
              <EuiText size="xs" color="subdued">
                <p>
                  {i18n.translate(
                    'xpack.significantEventsApp.cost.knowledgeIndicatorAttributionUnavailable',
                    {
                      defaultMessage:
                        'Not attributable until knowledge indicator inference moves to ai.agent steps.',
                    }
                  )}
                </p>
              </EuiText>
            ) : (
              <>
                {attribution.workflows.length > 0 && (
                  <>
                    <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" responsive={false}>
                      <EuiFlexItem>
                        <EuiText size="xs">
                          <p>
                            {i18n.translate(
                              'xpack.significantEventsApp.cost.workflowAttributedTotalLabel',
                              { defaultMessage: 'Workflow-attributed calls' }
                            )}
                          </p>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <CostValue figure={attribution} currency={currency} />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiText size="xs" color="subdued">
                      <p>
                        {attribution.coverage === 'partial'
                          ? i18n.translate(
                              'xpack.significantEventsApp.cost.partialWorkflowAttributionCaveat',
                              {
                                defaultMessage:
                                  'This attribution is a partial floor and is not added to the recorded-call total.',
                              }
                            )
                          : i18n.translate(
                              'xpack.significantEventsApp.cost.workflowAttributionCaveat',
                              {
                                defaultMessage:
                                  'This attribution is not added to the recorded-call total.',
                              }
                            )}
                        {attribution.reconciliationRatio !== null &&
                          ` ${i18n.translate(
                            'xpack.significantEventsApp.cost.reconciliationRatio',
                            {
                              defaultMessage:
                                'It covers {percentage}% of recorded-call tokens in this group.',
                              values: {
                                percentage: new Intl.NumberFormat(undefined, {
                                  maximumFractionDigits: 1,
                                }).format(attribution.reconciliationRatio * 100),
                              },
                            }
                          )}`}
                      </p>
                    </EuiText>
                  </>
                )}
                {attribution.workflows.length === 0 ? (
                  <EuiText size="xs" color="subdued">
                    <p>
                      {i18n.translate('xpack.significantEventsApp.cost.noWorkflowAttribution', {
                        defaultMessage: 'No workflow-attributed tokens today.',
                      })}
                    </p>
                  </EuiText>
                ) : (
                  attribution.workflows.map((workflow) => (
                    <React.Fragment key={workflow.workflowId}>
                      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" responsive={false}>
                        <EuiFlexItem>
                          <EuiText size="xs">
                            <p>{workflow.workflowId}</p>
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <CostValue figure={workflow} currency={currency} />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      {workflow.steps.map((step) => (
                        <EuiFlexGroup
                          key={`${workflow.workflowId}:${step.stepId}:${step.connectorId}`}
                          justifyContent="spaceBetween"
                          gutterSize="s"
                          responsive={false}
                        >
                          <EuiFlexItem>
                            <EuiText size="xs" color="subdued">
                              <p>
                                {i18n.translate(
                                  'xpack.significantEventsApp.cost.workflowStepLabel',
                                  {
                                    defaultMessage: 'Step {stepId} using {connectorId}',
                                    values: {
                                      stepId: step.stepId,
                                      connectorId: step.connectorId,
                                    },
                                  }
                                )}
                              </p>
                            </EuiText>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <CostValue figure={step} currency={currency} />
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      ))}
                    </React.Fragment>
                  ))
                )}
                {attribution.otherPathsTokens > 0 && (
                  <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" responsive={false}>
                    <EuiFlexItem>
                      <EuiText size="xs">
                        <p>
                          {i18n.translate(
                            'xpack.significantEventsApp.cost.otherRecordedPathsLabel',
                            { defaultMessage: 'Other recorded paths' }
                          )}
                        </p>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <CostValue
                        figure={{
                          estimatedCost: attribution.otherPathsEstimatedCost,
                          coverage:
                            attribution.otherPathsEstimatedCost === null
                              ? 'unavailable'
                              : data.today.tokenIndex.groups[group].coverage,
                        }}
                        currency={currency}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                )}
              </>
            )}
            {attribution.inconsistent && (
              <EuiCallOut
                announceOnMount
                size="s"
                color="warning"
                iconType="warning"
                title={i18n.translate(
                  'xpack.significantEventsApp.cost.attributionInconsistentWarning',
                  {
                    defaultMessage:
                      'Workflow attribution does not reconcile with the recorded-call total for this group.',
                  }
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </EuiAccordion>
  );
};

const RUN_GROUPS: RunBudgetGroupId[] = ['detection', 'investigation', 'ki_extraction', 'memory'];

export const CostEstimate = ({
  canManage,
  groupLabels,
}: {
  canManage: boolean;
  groupLabels: Record<RunBudgetGroupId, string>;
}) => {
  const cost = useSignificantEventsCost({ enabled: canManage });
  const { setTracking, isUpdating } = useSetSignificantEventsTokenTracking();
  const [showDisableConfirmation, setShowDisableConfirmation] = useState(false);
  const disableTitleId = useGeneratedHtmlId({
    prefix: 'disableTokenTrackingTitle',
  });
  const data = canManage ? cost.data : undefined;
  const untrackedNewSpaces = useMemo(() => {
    if (!data) {
      return [];
    }
    const untrackedIds = new Set(data.spaceCoverage.untrackedSpaces.map(({ id }) => id));
    return data.spaceCoverage.newSpaces.filter(({ id }) => untrackedIds.has(id));
  }, [data]);
  const headline = useMemo(() => {
    if (!data) {
      return undefined;
    }
    const unable = i18n.translate('xpack.significantEventsApp.cost.unavailableHeadlineValue', {
      defaultMessage: 'Unable to calculate',
    });
    const today =
      formatApproximateCost({
        figure: data.today.tokenIndex.total,
        currency: data.today.tokenIndex.currency,
      }) ?? unable;
    if (data.month.tokenIndex.period.label !== 'month_to_date') {
      return i18n.translate('xpack.significantEventsApp.cost.todayHeadline', {
        defaultMessage: '{today} today',
        values: { today },
      });
    }
    const month =
      formatApproximateCost({
        figure: data.month.tokenIndex.total,
        currency: data.month.tokenIndex.currency,
      }) ?? unable;
    return i18n.translate('xpack.significantEventsApp.cost.todayAndMonthHeadline', {
      defaultMessage: '{today} today · {month} this month',
      values: { today, month },
    });
  }, [data]);
  const trackingGapRanges = useMemo(
    () => data?.month.workflowAttribution.trackingGaps.map(formatTrackingGapRange).join(', '),
    [data]
  );
  const honestyWarnings = useMemo(() => {
    if (!data) {
      return [];
    }
    const warnings: string[] = [];
    if (data.today.tokenIndex.unknownFeatureDocumentCount > 0) {
      warnings.push(
        i18n.translate('xpack.significantEventsApp.cost.unknownFeatureWarning', {
          defaultMessage:
            '{count, plural, one {# recorded call has} other {# recorded calls have}} an unknown cost category, so the headline and group totals may not reconcile.',
          values: {
            count: data.today.tokenIndex.unknownFeatureDocumentCount,
          },
        })
      );
    }
    if (data.today.tokenIndex.tierCrossings.length > 0) {
      warnings.push(
        i18n.translate('xpack.significantEventsApp.cost.priceTierCrossingWarning', {
          defaultMessage:
            'Lower-tier prices were used for calls above a prompt threshold: {crossings}.',
          values: {
            crossings: data.today.tokenIndex.tierCrossings
              .map(({ modelId, documentCount }) => `${modelId} (${documentCount})`)
              .join(', '),
          },
        })
      );
    }
    if (data.today.tokenIndex.priceStale) {
      warnings.push(
        i18n.translate('xpack.significantEventsApp.cost.stalePriceWarning', {
          defaultMessage:
            'The current price table could not be refreshed, so cached prices were used.',
        })
      );
    }
    if (data.today.tokenIndex.serviceMapStale) {
      warnings.push(
        i18n.translate('xpack.significantEventsApp.cost.staleServiceMapWarning', {
          defaultMessage:
            'Inference endpoint details could not be refreshed, so cached endpoint details were used.',
        })
      );
    }
    if (data.spaceCoverage.unavailableSpaceCount > 0) {
      warnings.push(
        i18n.translate('xpack.significantEventsApp.cost.unavailableSpaceWarning', {
          defaultMessage:
            'Token tracking state could not be read in {count, plural, one {# space} other {# spaces}}.',
          values: { count: data.spaceCoverage.unavailableSpaceCount },
        })
      );
    }
    return warnings;
  }, [data]);

  const enableAll = () => {
    void setTracking(true).catch(() => undefined);
  };

  return (
    <EuiPanel hasBorder hasShadow={false} data-test-subj="significantEventsCostEstimate">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('xpack.significantEventsApp.cost.sectionTitle', {
                defaultMessage: 'Estimated cost',
              })}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        {canManage && data && (
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={i18n.translate(
                'xpack.significantEventsApp.cost.allSpacesTrackingSwitchLabel',
                { defaultMessage: 'Track tokens in all spaces' }
              )}
              checked={data.spaceCoverage.allSpacesTracked}
              disabled={isUpdating}
              onChange={(event) => {
                if (event.target.checked) {
                  enableAll();
                } else {
                  setShowDisableConfirmation(true);
                }
              }}
              data-test-subj="significantEventsAllSpacesTrackingSwitch"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      {!canManage && (
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.significantEventsApp.cost.globalPrivilegeRequired', {
              defaultMessage:
                'Deployment-wide cost is available to users who can manage Streams in all spaces.',
            })}
          </p>
        </EuiText>
      )}
      {canManage && cost.isLoading && <EuiLoadingSpinner size="m" />}
      {canManage && cost.isError && (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="error"
          title={i18n.translate('xpack.significantEventsApp.cost.loadErrorTitle', {
            defaultMessage: 'Could not load the cost approximation',
          })}
        />
      )}

      {data && untrackedNewSpaces.length > 0 && (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType="warning"
            title={i18n.translate('xpack.significantEventsApp.cost.newUntrackedSpacesTitle', {
              defaultMessage:
                'New {count, plural, one {space} other {spaces}} without token tracking: {names}',
              values: {
                count: untrackedNewSpaces.length,
                names: untrackedNewSpaces.map(({ name }) => name).join(', '),
              },
            })}
          >
            <EuiButton size="s" onClick={enableAll} isLoading={isUpdating}>
              {i18n.translate('xpack.significantEventsApp.cost.enableAllSpacesButtonLabel', {
                defaultMessage: 'Enable for all spaces',
              })}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {data?.spaceCoverage.currentSpaceTracking !== 'enabled' && data && (
        <EuiCallOut
          announceOnMount
          color="warning"
          iconType="warning"
          title={
            data.spaceCoverage.currentSpaceTracking === 'disabled'
              ? i18n.translate('xpack.significantEventsApp.cost.currentSpaceTrackingOffTitle', {
                  defaultMessage:
                    'Token usage tracking is off in this space, so estimated costs are not shown.',
                })
              : i18n.translate('xpack.significantEventsApp.cost.currentSpaceTrackingUnknownTitle', {
                  defaultMessage:
                    'Token usage tracking could not be read in this space, so estimated costs are not shown.',
                })
          }
        >
          <EuiButton size="s" onClick={enableAll} isLoading={isUpdating}>
            {i18n.translate('xpack.significantEventsApp.cost.enableTrackingButtonLabel', {
              defaultMessage: 'Enable in all spaces',
            })}
          </EuiButton>
        </EuiCallOut>
      )}

      {data?.spaceCoverage.currentSpaceTracking === 'enabled' && (
        <>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiText size="m">
                <p data-test-subj="significantEventsCostHeadline">
                  <strong>{headline}</strong>{' '}
                  {(data.today.tokenIndex.total.coverage === 'partial' ||
                    (data.month.tokenIndex.period.label === 'month_to_date' &&
                      data.month.tokenIndex.total.coverage === 'partial')) && (
                    <EuiBadge color="warning">
                      {i18n.translate('xpack.significantEventsApp.cost.partialHeadlineBadge', {
                        defaultMessage: 'Partial floor',
                      })}
                    </EuiBadge>
                  )}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                onClick={() => cost.refetch()}
                isLoading={cost.isFetching}
                data-test-subj="significantEventsRefreshCost"
              >
                {i18n.translate('xpack.significantEventsApp.cost.refreshButtonLabel', {
                  defaultMessage: 'Refresh',
                })}
              </EuiButtonEmpty>
              <EuiText size="xs" color="subdued">
                <p>
                  {i18n.translate('xpack.significantEventsApp.cost.asOfLabel', {
                    defaultMessage: 'As of {asOf, time, short}',
                    values: { asOf: new Date(data.asOf) },
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          {data.month.tokenIndex.period.label !== 'month_to_date' && (
            <EuiText size="xs" color="subdued">
              <p>
                {i18n.translate('xpack.significantEventsApp.cost.monthFigureWithheld', {
                  defaultMessage:
                    'A calendar-month figure will appear after tracking has been audited for the full period.',
                })}
              </p>
            </EuiText>
          )}
          <EuiText size="xs" color="subdued">
            <p>
              {data.spaceCoverage.coveredSpaceCount < data.spaceCoverage.totalSpaceCount &&
                i18n.translate('xpack.significantEventsApp.cost.spaceCoverageClause', {
                  defaultMessage:
                    'Based on {covered} of {total} spaces with token usage tracking enabled. ',
                  values: {
                    covered: data.spaceCoverage.coveredSpaceCount,
                    total: data.spaceCoverage.totalSpaceCount,
                  },
                })}
              {data.today.tokenIndex.currency.symbol
                ? i18n.translate('xpack.significantEventsApp.cost.usdDisclosure', {
                    defaultMessage:
                      'Approximate USD list-price floors for recorded chat-completion calls. Embedding, rerank, ELSER, failed calls, and index write failures are excluded. Not your billed amount.',
                  })
                : i18n.translate('xpack.significantEventsApp.cost.currencyUnknownDisclosure', {
                    defaultMessage:
                      'Approximate list-price units per 1M Token for recorded chat-completion calls. The price source did not confirm USD, so no currency symbol is shown. Embedding, rerank, ELSER, failed calls, and index write failures are excluded. Not your billed amount.',
                  })}
            </p>
          </EuiText>
          {honestyWarnings.length > 0 && (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut
                announceOnMount
                color="warning"
                iconType="warning"
                title={i18n.translate('xpack.significantEventsApp.cost.inputWarningsTitle', {
                  defaultMessage: 'Some cost inputs are incomplete',
                })}
              >
                <ul>
                  {honestyWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </EuiCallOut>
            </>
          )}
          {data.today.tokenIndex.total.nonEisTokenCount > 0 && (
            <EuiText size="xs" color="subdued">
              <p>
                {i18n.translate('xpack.significantEventsApp.cost.nonEisClause', {
                  defaultMessage:
                    '{percentage}% of recorded tokens used {sources}, which cannot be priced.',
                  values: {
                    percentage: Math.round(
                      (data.today.tokenIndex.total.nonEisTokenCount /
                        billableTokens(data.today.tokenIndex.total)) *
                        100
                    ),
                    sources: nonEisSourceLabel(data.today.tokenIndex.total),
                  },
                })}
              </p>
            </EuiText>
          )}
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            {RUN_GROUPS.map((group) => {
              const figure = data.today.tokenIndex.groups[group];
              return (
                <EuiFlexItem key={group}>
                  <EuiPanel hasShadow={false} color="subdued" paddingSize="s">
                    <EuiText size="xs">
                      <strong>{groupLabels[group]}</strong>
                    </EuiText>
                    <CostValue figure={figure} currency={data.today.tokenIndex.currency} />
                    {figure.coverage === 'partial' && (
                      <EuiBadge color="warning">
                        {i18n.translate('xpack.significantEventsApp.cost.partialFloorBadge', {
                          defaultMessage: 'Partial floor',
                        })}
                      </EuiBadge>
                    )}
                  </EuiPanel>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
          {trackingGapRanges && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                announceOnMount
                color="warning"
                iconType="warning"
                title={i18n.translate('xpack.significantEventsApp.cost.trackingGapTitle', {
                  defaultMessage:
                    'Cost approximation is incomplete: token tracking was off on {ranges} while workflows ran.',
                  values: { ranges: trackingGapRanges },
                })}
              />
            </>
          )}
          <EuiSpacer size="m" />
          <WorkflowAttribution data={data} groupLabels={groupLabels} />
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate('xpack.significantEventsApp.cost.interactiveChatsExcluded', {
                defaultMessage:
                  'Interactive Agent Builder chats are excluded because serving-agent attribution is not recorded.',
              })}
            </p>
          </EuiText>
        </>
      )}

      {showDisableConfirmation && (
        <EuiConfirmModal
          title={i18n.translate('xpack.significantEventsApp.cost.disableTrackingModalTitle', {
            defaultMessage: 'Stop token tracking in all spaces?',
          })}
          aria-labelledby={disableTitleId}
          titleProps={{ id: disableTitleId }}
          onCancel={() => setShowDisableConfirmation(false)}
          onConfirm={() => {
            void setTracking(false)
              .then(() => setShowDisableConfirmation(false))
              .catch(() => undefined);
          }}
          cancelButtonText={i18n.translate(
            'xpack.significantEventsApp.cost.disableTrackingCancelButton',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.significantEventsApp.cost.disableTrackingConfirmButton',
            { defaultMessage: 'Stop tracking' }
          )}
          buttonColor="danger"
          isLoading={isUpdating}
        >
          <p>
            {i18n.translate('xpack.significantEventsApp.cost.disableTrackingWarning', {
              defaultMessage:
                'Collection will stop for all AI features deployment-wide. Elastic Inference Service spend will continue without being recorded, and the off period can never be reconstructed.',
            })}
          </p>
        </EuiConfirmModal>
      )}
    </EuiPanel>
  );
};
