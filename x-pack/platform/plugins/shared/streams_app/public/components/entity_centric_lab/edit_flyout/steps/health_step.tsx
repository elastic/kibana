/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EntityTypeDraft, HealthSignals } from '../fake_entity_type_draft';

interface Props {
  readonly draft: EntityTypeDraft;
  readonly onChange: (next: HealthSignals) => void;
}

interface ToggleRow {
  readonly key: keyof HealthSignals;
  readonly label: string;
  readonly explanation: string;
}

export const HealthStep = ({ draft, onChange }: Props) => {
  const { health } = draft;

  const rows: readonly ToggleRow[] = [
    {
      key: 'activeAlertsSeverity',
      label: i18n.translate('xpack.streams.entityCentricLab.editFlyout.health.activeAlertsLabel', {
        defaultMessage: 'Active alerts severity',
      }),
      explanation: i18n.translate(
        'xpack.streams.entityCentricLab.editFlyout.health.activeAlertsExplanation',
        {
          defaultMessage: 'Critical alert: unhealthy, warning alert: at risk',
        }
      ),
    },
    {
      key: 'availableSignals',
      label: i18n.translate(
        'xpack.streams.entityCentricLab.editFlyout.health.availableSignalsLabel',
        {
          defaultMessage: 'Available signals',
        }
      ),
      explanation: i18n.translate(
        'xpack.streams.entityCentricLab.editFlyout.health.availableSignalsExplanation',
        {
          defaultMessage:
            'Roll up golden signals (latency, error rate, throughput) into the health indicator.',
        }
      ),
    },
    {
      key: 'securitySignals',
      label: i18n.translate(
        'xpack.streams.entityCentricLab.editFlyout.health.securitySignalsLabel',
        {
          defaultMessage: 'Security signals',
        }
      ),
      explanation: i18n.translate(
        'xpack.streams.entityCentricLab.editFlyout.health.securitySignalsExplanation',
        {
          defaultMessage:
            'Open security issues with high or critical severity downgrade the indicator.',
        }
      ),
    },
  ];

  return (
    <div data-test-subj="entityCentricLabEditFlyoutHealthStep">
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.streams.entityCentricLab.editFlyout.health.intro', {
            defaultMessage:
              'Entity types have a glanceable health indicator. Choose which signals feed into this indicator.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center" wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color="success">
            {i18n.translate('xpack.streams.entityCentricLab.editFlyout.health.healthyBadge', {
              defaultMessage: 'Healthy',
            })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="warning">
            {i18n.translate('xpack.streams.entityCentricLab.editFlyout.health.atRiskBadge', {
              defaultMessage: 'At risk',
            })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="danger">
            {i18n.translate('xpack.streams.entityCentricLab.editFlyout.health.unhealthyBadge', {
              defaultMessage: 'Unhealthy',
            })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <EuiFlexGroup direction="column" gutterSize="m">
        {rows.map((row) => (
          <EuiFlexItem key={row.key} grow={false}>
            <EuiPanel hasBorder hasShadow={false} paddingSize="m">
              <EuiSwitch
                label={row.label}
                checked={health[row.key]}
                onChange={(event) => onChange({ ...health, [row.key]: event.target.checked })}
                data-test-subj={`entityCentricLabEditFlyoutHealth-${row.key}`}
              />
              <EuiSpacer size="xs" />
              <EuiText size="xs" color="subdued">
                <p>{row.explanation}</p>
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
};
