/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import type { SeedDataSetId } from '../../common/seed_data/constants';
import { getSeedErrorMessage, SEED_DATA_CARDS, seedDataset } from './seed_data_api';

type SeedStatus = 'idle' | 'loading' | 'success' | 'error';

export const SeedLabFab: React.FC<{ core: CoreStart }> = ({ core }) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [statusById, setStatusById] = useState<Partial<Record<SeedDataSetId, SeedStatus>>>({});
  const [seedAllLoading, setSeedAllLoading] = useState(false);

  const runSeed = useCallback(
    async (id: SeedDataSetId) => {
      setStatusById((prev) => ({ ...prev, [id]: 'loading' }));
      try {
        const message = await seedDataset(core.http, id);
        setStatusById((prev) => ({ ...prev, [id]: 'success' }));
        core.notifications.toasts.addSuccess({
          title: i18n.translate('xpack.agentBuilderDashboards.seedData.toast.success', {
            defaultMessage: 'Seeded {id}',
            values: { id },
          }),
          text: message,
        });
      } catch (error) {
        const message = getSeedErrorMessage(error);
        setStatusById((prev) => ({ ...prev, [id]: 'error' }));
        core.notifications.toasts.addError(error instanceof Error ? error : new Error(message), {
          title: i18n.translate('xpack.agentBuilderDashboards.seedData.toast.error', {
            defaultMessage: 'Failed to seed {id}',
            values: { id },
          }),
        });
      }
    },
    [core.http, core.notifications.toasts]
  );

  const runSeedAll = useCallback(async () => {
    setSeedAllLoading(true);
    for (const card of SEED_DATA_CARDS) {
      await runSeed(card.id);
    }
    setSeedAllLoading(false);
  }, [runSeed]);

  const button = (
    <button
      type="button"
      data-test-subj="seedLabFabButton"
      aria-label={i18n.translate('xpack.agentBuilderDashboards.seedData.fab.ariaLabel', {
        defaultMessage: 'Open lab seed data menu',
      })}
      onClick={() => setIsOpen((open) => !open)}
      css={css`
        display: inline-flex;
        align-items: center;
        gap: ${euiTheme.size.s};
        padding: ${euiTheme.size.m} ${euiTheme.size.l};
        border: none;
        border-radius: 999px;
        cursor: pointer;
        color: #fff;
        background: linear-gradient(135deg, #0b6e99 0%, #00bfb3 100%);
        box-shadow: 0 8px 24px rgba(11, 110, 153, 0.35);
        font-weight: ${euiTheme.font.weight.bold};
        font-size: ${euiTheme.size.m};
        line-height: 1;
        transition: transform 120ms ease, box-shadow 120ms ease;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(11, 110, 153, 0.45);
        }

        &:focus-visible {
          outline: 2px solid ${euiTheme.colors.primary};
          outline-offset: 3px;
        }
      `}
    >
      <EuiIcon type="flask" size="m" color="#fff" />
      <FormattedMessage id="xpack.agentBuilderDashboards.seedData.fab.label" defaultMessage="Lab" />
    </button>
  );

  return (
    <div
      data-test-subj="seedLabFab"
      css={css`
        position: fixed;
        right: ${euiTheme.size.xl};
        bottom: calc(${euiTheme.size.xl} + 48px);
        z-index: 9000;
      `}
    >
      <EuiPopover
        ownFocus
        button={button}
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        anchorPosition="upRight"
        panelPaddingSize="none"
        repositionOnScroll
      >
        <EuiPanel
          paddingSize="m"
          css={css`
            width: 340px;
            max-width: min(340px, 90vw);
          `}
        >
          <EuiTitle size="xs">
            <h2>
              <FormattedMessage
                id="xpack.agentBuilderDashboards.seedData.fab.panelTitle"
                defaultMessage="Seed sample data"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.agentBuilderDashboards.seedData.fab.panelDescription"
                defaultMessage="Install dashboards + data without leaving this page (Flights, eCommerce, Kubernetes OTel)."
              />
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup direction="column" gutterSize="s">
            {SEED_DATA_CARDS.map((card) => {
              const status = statusById[card.id] ?? 'idle';
              return (
                <EuiFlexItem key={card.id}>
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>{card.title}</strong>
                      </EuiText>
                      <EuiText size="xs" color="subdued">
                        {card.dashboardHint}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="s"
                        isLoading={status === 'loading'}
                        onClick={() => {
                          void runSeed(card.id);
                        }}
                        data-test-subj={`seedLabFabSeed-${card.id}`}
                      >
                        <FormattedMessage
                          id="xpack.agentBuilderDashboards.seedData.fab.seed"
                          defaultMessage="Install"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
          <EuiHorizontalRule margin="m" />
          <EuiButton
            fullWidth
            fill
            size="s"
            isLoading={seedAllLoading}
            onClick={() => {
              void runSeedAll();
            }}
            data-test-subj="seedLabFabSeedAll"
          >
            <FormattedMessage
              id="xpack.agentBuilderDashboards.seedData.fab.seedAll"
              defaultMessage="Install & seed all"
            />
          </EuiButton>
        </EuiPanel>
      </EuiPopover>
    </div>
  );
};
