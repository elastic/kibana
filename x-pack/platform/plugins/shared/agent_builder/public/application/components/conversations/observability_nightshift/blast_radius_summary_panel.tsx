/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { ActiveSignificantEventsFlyout } from './active_significant_events_flyout';
import { BlastRadiusDonut } from './blast_radius_donut';
import { BlastRadiusEntityFlyout } from './blast_radius_entity_flyout';

const CRITICAL_SCORE_THRESHOLD = 80;
const BLAST_RADIUS_CARD_BORDER_RADIUS = '16px';

interface EntityRowConfig {
  id: string;
  title: string;
  iconType: React.ComponentProps<typeof EuiIcon>['type'];
  iconColor: React.ComponentProps<typeof EuiIcon>['color'];
  badgeLabel: string;
  badgeColor: React.ComponentProps<typeof EuiBadge>['color'];
}

export const BlastRadiusSummaryPanel: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { upsertAttachments } = useConversationContext();
  const entities: EntityRowConfig[] = useMemo(
    () => [
      {
        id: 'critical',
        title: i18n.translate(
          'xpack.agentBuilder.observabilityNightshift.entities.criticallyAffected',
          {
            defaultMessage: 'Critically affected entities',
          }
        ),
        iconType: 'errorFilled',
        iconColor: 'danger',
        badgeLabel: '6/48',
        badgeColor: 'danger',
      },
      {
        id: 'high',
        title: i18n.translate('xpack.agentBuilder.observabilityNightshift.entities.highRisk', {
          defaultMessage: 'High risk entities',
        }),
        iconType: 'alert',
        iconColor: 'warning',
        badgeLabel: '6/48',
        badgeColor: 'warning',
      },
      {
        id: 'sig',
        title: i18n.translate(
          'xpack.agentBuilder.observabilityNightshift.entities.significantEvents',
          {
            defaultMessage: 'Active significant events',
          }
        ),
        iconType: 'errorFilled',
        iconColor: 'danger',
        badgeLabel: '24',
        badgeColor: 'danger',
      },
    ],
    []
  );

  const blastRadiusScore = 85;
  const isCriticalBlast = blastRadiusScore > CRITICAL_SCORE_THRESHOLD;
  const criticalCount = 6;
  const highCount = 7;
  const significantEvents = 24;

  const [openEntityId, setOpenEntityId] = useState<string | null>(null);
  const openEntity = openEntityId ? entities.find((e) => e.id === openEntityId) : undefined;

  const closeFlyout = useCallback(() => setOpenEntityId(null), []);

  const attachBlastRadiusEntityContext = useCallback(
    (entity: EntityRowConfig) => {
      if (entity.id === 'sig') {
        upsertAttachments?.([
          {
            id: 'nightshift-sig-events-blast-summary',
            type: AttachmentType.text,
            data: {
              label: i18n.translate(
                'xpack.agentBuilder.observabilityNightshift.attachment.sigEventsBulkChipLabel',
                {
                  defaultMessage: '{count} Significant events',
                  values: { count: entity.badgeLabel },
                }
              ),
              icon_type: 'indexClose',
              content: i18n.translate(
                'xpack.agentBuilder.observabilityNightshift.attachment.sigEventsBlastSummaryText',
                {
                  defaultMessage:
                    'Nightshift — active significant events (blast radius)\nOpen events (prototype count): {count}\nUse per-event clips in the Active significant events view to attach individual titles and stream details.',
                  values: { count: entity.badgeLabel },
                }
              ),
            },
          },
        ]);
        return;
      }

      upsertAttachments?.([
        {
          id: `nightshift-blast-entity-${entity.id}`,
          type: AttachmentType.text,
          data: {
            label: entity.title,
            content: i18n.translate(
              'xpack.agentBuilder.observabilityNightshift.attachment.blastRadiusEntityText',
              {
                defaultMessage:
                  'Nightshift — blast radius\nEntity: {entityTitle}\nIndicator: {badgeLabel}',
                values: {
                  entityTitle: entity.title,
                  badgeLabel: entity.badgeLabel,
                },
              }
            ),
          },
        },
      ]);
    },
    [upsertAttachments]
  );

  const outerCardCss = css`
    border: ${euiTheme.border.thin};
    border-radius: ${BLAST_RADIUS_CARD_BORDER_RADIUS};
    overflow: hidden;
    width: 100%;
    box-sizing: border-box;
  `;

  const topSectionCss = css`
    background: ${euiTheme.colors.backgroundBaseSubdued};
    padding: ${euiTheme.size.l};
  `;

  const bottomSectionCss = css`
    background: ${euiTheme.colors.backgroundBasePlain};
    padding: ${euiTheme.size.m} ${euiTheme.size.l} ${euiTheme.size.l} ${euiTheme.size.l};
  `;

  return (
    <>
      <div css={outerCardCss} data-test-subj="agentBuilderBlastRadiusPanel">
        <div css={topSectionCss}>
          <EuiFlexGroup responsive={false} alignItems="flexStart" gutterSize="l">
            <EuiFlexItem grow={false}>
              <BlastRadiusDonut score={blastRadiusScore} isCritical={isCriticalBlast} />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiFlexGroup
                responsive={false}
                alignItems="flexStart"
                justifyContent="spaceBetween"
                gutterSize="m"
              >
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    {i18n.translate('xpack.agentBuilder.observabilityNightshift.blastRadiusLabel', {
                      defaultMessage: 'Blast radius score',
                    })}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {i18n.translate(
                          'xpack.agentBuilder.observabilityNightshift.scoreTimestamp',
                          {
                            defaultMessage: '(5 minutes ago)',
                          }
                        )}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="refresh"
                        color="text"
                        display="empty"
                        size="xs"
                        aria-label={i18n.translate(
                          'xpack.agentBuilder.observabilityNightshift.refreshScoreAria',
                          {
                            defaultMessage: 'Refresh blast radius score',
                          }
                        )}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="boxesVertical"
                        color="text"
                        display="empty"
                        size="xs"
                        aria-label={i18n.translate(
                          'xpack.agentBuilder.observabilityNightshift.scoreMoreActionsAria',
                          {
                            defaultMessage: 'More blast radius score actions',
                          }
                        )}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiTitle
                size="m"
                css={{ color: euiTheme.colors.dangerText, marginTop: euiTheme.size.xs }}
              >
                <span css={{ color: euiTheme.colors.dangerText }}>
                  {i18n.translate('xpack.agentBuilder.observabilityNightshift.blastLevelHigh', {
                    defaultMessage: 'HIGH',
                  })}
                </span>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.agentBuilder.observabilityNightshift.blastExplanation"
                  defaultMessage="The blast radius is measured high due to {criticalBadge} and {highBadge} severity impacted entities due to {eventsBadge} detected."
                  values={{
                    criticalBadge: <EuiBadge color="danger">{criticalCount} Critical</EuiBadge>,
                    highBadge: <EuiBadge color="warning">{highCount} High</EuiBadge>,
                    eventsBadge: (
                      <EuiBadge color="danger" iconType="layers">
                        {significantEvents} Significant events
                      </EuiBadge>
                    ),
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <EuiPanel
            hasBorder
            paddingSize="none"
            borderRadius="m"
            color="plain"
            data-test-subj="agentBuilderBlastRadiusEntityListPanel"
          >
            <EuiFlexGroup direction="column" gutterSize="none">
              {entities.map((entity, index) => (
                <React.Fragment key={entity.id}>
                  {index > 0 ? <EuiHorizontalRule margin="none" /> : null}
                  <EuiFlexGroup
                    responsive={false}
                    alignItems="center"
                    gutterSize="s"
                    css={css`
                      padding: ${euiTheme.size.s} ${euiTheme.size.m};
                    `}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="maximize"
                        display="empty"
                        size="xs"
                        color="text"
                        onClick={() => setOpenEntityId(entity.id)}
                        aria-label={i18n.translate(
                          'xpack.agentBuilder.observabilityNightshift.openEntityDetailsAria',
                          {
                            defaultMessage: 'Open details for {title}',
                            values: { title: entity.title },
                          }
                        )}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type={entity.iconType}
                        color={entity.iconColor}
                        size="m"
                        aria-hidden
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={true}>
                      <EuiText size="s">{entity.title}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadgeGroup gutterSize="s">
                        <EuiBadge color={entity.badgeColor}>{entity.badgeLabel}</EuiBadge>
                      </EuiBadgeGroup>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="paperClip"
                        display="empty"
                        size="xs"
                        color="text"
                        onClick={() => attachBlastRadiusEntityContext(entity)}
                        aria-label={i18n.translate(
                          'xpack.agentBuilder.observabilityNightshift.attachContextAria',
                          {
                            defaultMessage: 'Attach context for {title}',
                            values: { title: entity.title },
                          }
                        )}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="boxesVertical"
                        display="empty"
                        size="xs"
                        color="text"
                        aria-label={i18n.translate(
                          'xpack.agentBuilder.observabilityNightshift.entityMenuAria',
                          {
                            defaultMessage: 'More actions for {title}',
                            values: { title: entity.title },
                          }
                        )}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </React.Fragment>
              ))}
            </EuiFlexGroup>
          </EuiPanel>
        </div>

        <div css={bottomSectionCss}>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.agentBuilder.observabilityNightshift.panelFooter.lead', {
                defaultMessage:
                  'You can start remediation now with Elastic Agent Builder and understand how to solve these system issues.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGroup responsive={false} wrap gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButton size="s" color="text">
                {i18n.translate('xpack.agentBuilder.observabilityNightshift.reviewDetails', {
                  defaultMessage: 'Review details',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <AiButton
                size="s"
                variant="base"
                iconType="productAgent"
                onClick={() => {
                  /* prototype */
                }}
              >
                {i18n.translate('xpack.agentBuilder.observabilityNightshift.remediate', {
                  defaultMessage: 'Remediate',
                })}
              </AiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" iconType="refresh" color="primary">
                {i18n.translate('xpack.agentBuilder.observabilityNightshift.runInBackground', {
                  defaultMessage: 'Run in background',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>

      {openEntity ? (
        openEntity.id === 'sig' ? (
          <ActiveSignificantEventsFlyout onClose={closeFlyout} />
        ) : (
          <BlastRadiusEntityFlyout title={openEntity.title} onClose={closeFlyout} />
        )
      ) : null}
    </>
  );
};
