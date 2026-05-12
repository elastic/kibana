/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiEmptyPrompt,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { SkillAlert } from '../../../common/monitoring_types';
import { useAcknowledgeAlert } from '../../hooks/use_monitoring_api';
import * as i18n from './translations';

const SEVERITY_COLOR_MAP: Record<SkillAlert['severity'], string> = {
  warning: 'warning',
  critical: 'danger',
};

const TYPE_COLOR_MAP: Record<SkillAlert['type'], string> = {
  drift: 'primary',
  low_success_rate: 'warning',
  low_usage: 'hollow',
  error_spike: 'danger',
};

interface SkillAlertsPanelProps {
  skillId: string;
  alerts: SkillAlert[];
  isLoading?: boolean;
}

export const SkillAlertsPanel: React.FC<SkillAlertsPanelProps> = ({
  skillId,
  alerts,
  isLoading,
}) => {
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const acknowledgeAlert = useAcknowledgeAlert();

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (typeFilter && alert.type !== typeFilter) return false;
      if (severityFilter && alert.severity !== severityFilter) return false;
      return true;
    });
  }, [alerts, typeFilter, severityFilter]);

  const typeOptions = [
    { value: '', text: 'All types' },
    { value: 'drift', text: 'Drift' },
    { value: 'low_success_rate', text: 'Low success rate' },
    { value: 'low_usage', text: 'Low usage' },
    { value: 'error_spike', text: 'Error spike' },
  ];

  const severityOptions = [
    { value: '', text: 'All severities' },
    { value: 'warning', text: 'Warning' },
    { value: 'critical', text: 'Critical' },
  ];

  const columns: Array<EuiBasicTableColumn<SkillAlert>> = useMemo(
    () => [
      {
        field: 'type',
        name: i18n.ALERT_COLUMN_TYPE,
        width: '140px',
        render: (type: SkillAlert['type']) => (
          <EuiBadge color={TYPE_COLOR_MAP[type]}>{type.replace(/_/g, ' ')}</EuiBadge>
        ),
      },
      {
        field: 'severity',
        name: i18n.ALERT_COLUMN_SEVERITY,
        width: '100px',
        render: (severity: SkillAlert['severity']) => (
          <EuiBadge color={SEVERITY_COLOR_MAP[severity]}>{severity}</EuiBadge>
        ),
      },
      {
        field: 'message',
        name: i18n.ALERT_COLUMN_MESSAGE,
        truncateText: true,
      },
      {
        field: 'created_at',
        name: i18n.ALERT_COLUMN_CREATED,
        width: '180px',
        render: (createdAt: string) => new Date(createdAt).toLocaleString(),
      },
      {
        name: i18n.ALERT_COLUMN_ACTIONS,
        width: '120px',
        render: (alert: SkillAlert) =>
          !alert.acknowledged ? (
            <EuiButtonEmpty
              size="s"
              onClick={() => acknowledgeAlert.mutate({ skillId, alertId: alert.id })}
              isLoading={
                acknowledgeAlert.isLoading &&
                (acknowledgeAlert as { variables?: { alertId?: string } }).variables?.alertId ===
                  alert.id
              }
            >
              {i18n.ACKNOWLEDGE_BUTTON}
            </EuiButtonEmpty>
          ) : null,
      },
    ],
    [skillId, acknowledgeAlert]
  );

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h3>{i18n.ALERTS_SECTION_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false} style={{ minWidth: 160 }}>
          <EuiSelect
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            compressed
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ minWidth: 160 }}>
          <EuiSelect
            options={severityOptions}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            compressed
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {filteredAlerts.length === 0 && !isLoading ? (
        <EuiEmptyPrompt iconType="check" title={<h3>{i18n.NO_ALERTS}</h3>} titleSize="xs" />
      ) : (
        <EuiBasicTable<SkillAlert>
          items={filteredAlerts}
          columns={columns}
          loading={isLoading}
          rowProps={(item) => ({
            style: item.severity === 'critical' ? { backgroundColor: '#fce4ec' } : undefined,
          })}
        />
      )}
    </EuiPanel>
  );
};
