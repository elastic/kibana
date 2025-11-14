/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiTitle,
  EuiSpacer,
  EuiCard,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { useCloudConnectedAppContext } from '../../../application/app_context';
import { COLUMN_SIZE } from '../constants';

interface ServiceCardsProps {
  hasPermissions: boolean;
}

export const ServiceCards: React.FC<ServiceCardsProps> = ({ hasPermissions }) => {
  const { docLinks } = useCloudConnectedAppContext();

  return (
    <EuiFlexItem
      grow={!hasPermissions}
      style={hasPermissions ? { width: `${COLUMN_SIZE}px` } : undefined}
    >
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.cloudConnect.serviceCards.title', {
            defaultMessage: 'Cloud Connect services',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiFlexGroup direction={hasPermissions ? 'column' : 'row'} gutterSize="m">
        <EuiFlexItem>
          <EuiCard
            hasBorder
            layout="horizontal"
            title={i18n.translate('xpack.cloudConnect.serviceCards.autoOps.title', {
              defaultMessage: 'AutoOps',
            })}
            description={i18n.translate('xpack.cloudConnect.serviceCards.autoOps.description', {
              defaultMessage:
                'Get instant cluster diagnostics, performance tips, and cost-saving recommendations—no extra management needed.',
            })}
            titleSize="xs"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            hasBorder
            layout="horizontal"
            title={i18n.translate('xpack.cloudConnect.serviceCards.elasticInference.title', {
              defaultMessage: 'Elastic Inference Service',
            })}
            description={i18n.translate(
              'xpack.cloudConnect.serviceCards.elasticInference.description',
              {
                defaultMessage:
                  'Tap into AI-powered search and chat—no ML model deployment or management needed. Fast, scalable, and hassle-free intelligent features.',
              }
            )}
            titleSize="xs"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            hasBorder
            layout="horizontal"
            title={i18n.translate('xpack.cloudConnect.serviceCards.synthetic.title', {
              defaultMessage: 'Synthetic',
            })}
            description={i18n.translate('xpack.cloudConnect.serviceCards.synthetic.description', {
              defaultMessage:
                'Proactive, automated monitoring for apps and APIs—catch issues early, get deep diagnostics, and integrate easily.',
            })}
            titleSize="xs"
            betaBadgeProps={{
              label: i18n.translate('xpack.cloudConnect.serviceCards.synthetic.comingSoon', {
                defaultMessage: 'COMING SOON',
              }),
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="popout"
            iconSide="right"
            href={docLinks.links.cloud.cloudConnect}
            target="_blank"
          >
            {i18n.translate('xpack.cloudConnect.serviceCards.learnMore', {
              defaultMessage: 'Learn more',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
