/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import {
  SEED_DATA_ECOMMERCE_ID,
  SEED_DATA_FLIGHTS_ID,
  SEED_DATA_KUBERNETES_ID,
  type SeedDataSetId,
} from '../../common/seed_data/constants';
import { getSeedErrorMessage, SEED_DATA_CARDS, seedDataset } from './seed_data_api';

type SeedStatus = 'idle' | 'loading' | 'success' | 'error';

export const SeedDataPage: React.FC<{ core: CoreStart }> = ({ core }) => {
  const [statusById, setStatusById] = useState<Record<SeedDataSetId, SeedStatus>>({
    [SEED_DATA_FLIGHTS_ID]: 'idle',
    [SEED_DATA_ECOMMERCE_ID]: 'idle',
    [SEED_DATA_KUBERNETES_ID]: 'idle',
  });
  const [messageById, setMessageById] = useState<Partial<Record<SeedDataSetId, string>>>({});
  const [seedAllStatus, setSeedAllStatus] = useState<SeedStatus>('idle');

  const runSeed = useCallback(
    async (id: SeedDataSetId) => {
      setStatusById((prev) => ({ ...prev, [id]: 'loading' }));
      setMessageById((prev) => ({ ...prev, [id]: undefined }));
      try {
        const message = await seedDataset(core.http, id);
        setStatusById((prev) => ({ ...prev, [id]: 'success' }));
        setMessageById((prev) => ({ ...prev, [id]: message }));
        core.notifications.toasts.addSuccess(
          i18n.translate('xpack.agentBuilderDashboards.seedData.toast.success', {
            defaultMessage: 'Seeded {id}',
            values: { id },
          })
        );
      } catch (error) {
        const message = getSeedErrorMessage(error);
        setStatusById((prev) => ({ ...prev, [id]: 'error' }));
        setMessageById((prev) => ({ ...prev, [id]: message }));
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
    setSeedAllStatus('loading');
    for (const card of SEED_DATA_CARDS) {
      await runSeed(card.id);
    }
    setSeedAllStatus('idle');
  }, [runSeed]);

  return (
    <EuiPageTemplate offset={0} grow={false} restrictWidth="1000px">
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('xpack.agentBuilderDashboards.seedData.pageTitle', {
          defaultMessage: 'Seed sample data',
        })}
        description={i18n.translate('xpack.agentBuilderDashboards.seedData.pageDescription', {
          defaultMessage:
            'Prototype helper: install sample dashboards + data (Flights, eCommerce) or Kubernetes OTel package + metrics.',
        })}
        rightSideItems={[
          <EuiButton
            key="seedAll"
            fill
            isLoading={seedAllStatus === 'loading'}
            onClick={() => {
              void runSeedAll();
            }}
            data-test-subj="seedDataSeedAllButton"
          >
            <FormattedMessage
              id="xpack.agentBuilderDashboards.seedData.seedAll"
              defaultMessage="Seed all"
            />
          </EuiButton>,
        ]}
      />
      <EuiPageTemplate.Section>
        <EuiCallOut
          size="s"
          title={i18n.translate('xpack.agentBuilderDashboards.seedData.installHint', {
            defaultMessage:
              'Each Seed button installs dashboards (and data). Flights/eCommerce use Kibana sample data; Kubernetes installs the kubernetes_otel Fleet package then seeds metrics.',
          })}
          iconType="info"
        />
        <EuiSpacer size="l" />
        <EuiFlexGroup direction="column" gutterSize="m">
          {SEED_DATA_CARDS.map((card) => {
            const status = statusById[card.id];
            const message = messageById[card.id];
            return (
              <EuiFlexItem key={card.id}>
                <EuiPanel hasBorder paddingSize="l">
                  <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m">
                    <EuiFlexItem>
                      <EuiTitle size="s">
                        <h2>{card.title}</h2>
                      </EuiTitle>
                      <EuiSpacer size="s" />
                      <EuiText size="s" color="subdued">
                        <p>{card.description}</p>
                        <p>
                          <FormattedMessage
                            id="xpack.agentBuilderDashboards.seedData.dashboardHint"
                            defaultMessage="Dashboard: {name}"
                            values={{ name: <strong>{card.dashboardHint}</strong> }}
                          />
                        </p>
                      </EuiText>
                      {message ? (
                        <>
                          <EuiSpacer size="s" />
                          <EuiText size="s" color={status === 'error' ? 'danger' : 'success'}>
                            <p>{message}</p>
                          </EuiText>
                        </>
                      ) : null}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        isLoading={status === 'loading'}
                        onClick={() => {
                          void runSeed(card.id);
                        }}
                        data-test-subj={`seedDataButton-${card.id}`}
                      >
                        <FormattedMessage
                          id="xpack.agentBuilderDashboards.seedData.seedButton"
                          defaultMessage="Install & seed"
                        />
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
