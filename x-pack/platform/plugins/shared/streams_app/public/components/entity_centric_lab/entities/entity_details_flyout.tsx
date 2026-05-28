/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiContextMenu,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiTabs,
  EuiTab,
  EuiText,
  EuiTitle,
  transparentize,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import type { Entity, EntityHealth } from './fake_entities';
import { getCategoryDescriptor } from './fake_entities';

interface Props {
  readonly entity: Entity;
  readonly onClose: () => void;
}

type TabId = 'overview' | 'logs' | 'alerts' | 'dependencies' | 'more';

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  {
    id: 'overview',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.flyout.tabs.overview', {
      defaultMessage: 'Overview',
    }),
  },
  {
    id: 'logs',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.flyout.tabs.logs', {
      defaultMessage: 'Logs',
    }),
  },
  {
    id: 'alerts',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.flyout.tabs.alerts', {
      defaultMessage: 'Alerts',
    }),
  },
  {
    id: 'dependencies',
    label: i18n.translate('xpack.streams.entityCentricLab.entities.flyout.tabs.dependencies', {
      defaultMessage: 'Dependencies',
    }),
  },
];

const HEALTH_BADGE_COLOR: Record<EntityHealth, 'success' | 'warning' | 'danger'> = {
  healthy: 'success',
  atRisk: 'warning',
  unhealthy: 'danger',
};

const HEALTH_LABEL: Record<EntityHealth, string> = {
  healthy: i18n.translate('xpack.streams.entityCentricLab.entities.flyout.health.healthy', {
    defaultMessage: 'Healthy',
  }),
  atRisk: i18n.translate('xpack.streams.entityCentricLab.entities.flyout.health.atRisk', {
    defaultMessage: 'At risk',
  }),
  unhealthy: i18n.translate('xpack.streams.entityCentricLab.entities.flyout.health.unhealthy', {
    defaultMessage: 'Unhealthy',
  }),
};

export const EntityDetailsFlyout = ({ entity, onClose }: Props) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'entitiesLabFlyoutTitle' });
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  const heroClass = useMemo(
    () => css`
      background: linear-gradient(
        135deg,
        ${transparentize(euiTheme.colors.backgroundLightAssistance, 0.6)} 0%,
        ${transparentize(euiTheme.colors.backgroundLightAccent, 0.4)} 100%
      );
      border: 1px solid ${euiTheme.colors.borderBaseAssistance};
      border-radius: ${euiTheme.border.radius.medium};
      padding: ${euiTheme.size.m};
    `,
    [euiTheme]
  );

  const descriptor = getCategoryDescriptor(entity.category);

  const actionPanels = useMemo<EuiContextMenuPanelDescriptor[]>(
    () => [
      {
        id: 0,
        items: [
          {
            name: i18n.translate(
              'xpack.streams.entityCentricLab.entities.flyout.actions.viewInApm',
              { defaultMessage: 'View in APM' }
            ),
            icon: 'apmApp',
            onClick: () => setIsActionsOpen(false),
          },
          {
            name: i18n.translate(
              'xpack.streams.entityCentricLab.entities.flyout.actions.addToCase',
              { defaultMessage: 'Add to case' }
            ),
            icon: 'casesApp',
            onClick: () => setIsActionsOpen(false),
          },
          {
            name: i18n.translate('xpack.streams.entityCentricLab.entities.flyout.actions.copyId', {
              defaultMessage: 'Copy entity ID',
            }),
            icon: 'copyClipboard',
            onClick: () => setIsActionsOpen(false),
          },
        ],
      },
    ],
    []
  );

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby={titleId}
      size="l"
      data-test-subj="entityCentricLabEntityDetailsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          {descriptor?.icon ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type={descriptor.icon} size="l" aria-hidden />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id={titleId}>{entity.name}</h2>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiBadge color={HEALTH_BADGE_COLOR[entity.health]}>
                  {HEALTH_LABEL[entity.health]}
                </EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.streams.entityCentricLab.entities.flyout.meta.type', {
                    defaultMessage: 'Type: {type}',
                    values: { type: entity.type },
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate(
                    'xpack.streams.entityCentricLab.entities.flyout.meta.lastUpdate',
                    {
                      defaultMessage: 'Last update: {lastUpdate}',
                      values: { lastUpdate: entity.lastHealthChange },
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiPanel hasShadow={false} hasBorder={false} paddingSize="none" className={heroClass}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon
                type="sparkles"
                size="m"
                color={euiTheme.colors.textAssistance}
                aria-hidden
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>
                  {i18n.translate('xpack.streams.entityCentricLab.entities.flyout.heroTitle', {
                    defaultMessage: 'AI summary',
                  })}
                </strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.streams.entityCentricLab.entities.flyout.heroBody', {
                  defaultMessage:
                    'A short AI-generated description of the entity will live here. For now this is a placeholder; the full Overview content is being designed.',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiTabs size="s">
          {TABS.map((tab) => (
            <EuiTab
              key={tab.id}
              isSelected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-test-subj={`entityCentricLabEntityFlyoutTab-${tab.id}`}
            >
              {tab.label}
            </EuiTab>
          ))}
          <EuiTab
            isSelected={activeTab === 'more'}
            onClick={() => setActiveTab('more')}
            data-test-subj="entityCentricLabEntityFlyoutTab-more"
          >
            {i18n.translate('xpack.streams.entityCentricLab.entities.flyout.tabs.more', {
              defaultMessage: '…',
            })}
          </EuiTab>
        </EuiTabs>
        <EuiSpacer size="m" />
        <EuiEmptyPrompt
          iconType="visGauge"
          title={
            <h3>
              {i18n.translate('xpack.streams.entityCentricLab.entities.flyout.comingSoon.title', {
                defaultMessage: 'Coming soon',
              })}
            </h3>
          }
          body={
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate('xpack.streams.entityCentricLab.entities.flyout.comingSoon.body', {
                  defaultMessage:
                    'This flyout is wired up but the {tab} content is still being designed. Stay tuned!',
                  values: {
                    tab: TABS.find((tab) => tab.id === activeTab)?.label ?? 'tab',
                  },
                })}
              </p>
            </EuiText>
          }
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              display="empty"
              onClick={onClose}
              aria-label={i18n.translate(
                'xpack.streams.entityCentricLab.entities.flyout.closeAriaLabel',
                { defaultMessage: 'Close entity details flyout' }
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiPopover
                  panelPaddingSize="none"
                  isOpen={isActionsOpen}
                  closePopover={() => setIsActionsOpen(false)}
                  aria-label={i18n.translate(
                    'xpack.streams.entityCentricLab.entities.flyout.takeActionsPopoverAriaLabel',
                    { defaultMessage: 'Take actions menu' }
                  )}
                  button={
                    <EuiButton
                      iconType="arrowDown"
                      iconSide="right"
                      onClick={() => setIsActionsOpen((open) => !open)}
                      data-test-subj="entityCentricLabEntityFlyoutTakeActions"
                      aria-label={i18n.translate(
                        'xpack.streams.entityCentricLab.entities.flyout.takeActionsAriaLabel',
                        { defaultMessage: 'Take action menu' }
                      )}
                    >
                      {i18n.translate(
                        'xpack.streams.entityCentricLab.entities.flyout.takeActions',
                        { defaultMessage: 'Take actions' }
                      )}
                    </EuiButton>
                  }
                >
                  <EuiContextMenu initialPanelId={0} panels={actionPanels} />
                </EuiPopover>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill iconType="comment" disabled>
                  {i18n.translate('xpack.streams.entityCentricLab.entities.flyout.addToChat', {
                    defaultMessage: 'Add to chat',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
