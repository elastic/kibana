/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiPanel,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiLink,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useHistory } from 'react-router-dom';
import { useService } from '@kbn/core-di-browser';
import { RulesApi } from '../../services/rules_api';
import { useUpdateFindingStatus } from '../../hooks/use_update_finding_status';
import { paths } from '../../constants';
import type { RuleDoctorFinding } from './types';

const TYPE_COLORS: Record<string, string> = {
  deduplication: '#F5A623',
  threshold_tuning: '#9B59B6',
  stale_rule: '#E74C3C',
  coverage_gap: '#2980B9',
};

const DEFAULT_TYPE_COLOR = '#95A5A6';

const getTypeColor = (type: string): string => TYPE_COLORS[type] ?? DEFAULT_TYPE_COLOR;

const formatTypeName = (type: string): string =>
  type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const ACTION_LABELS: Record<string, Record<string, { icon: string; label: string }>> = {
  deduplication: {
    merge: { icon: 'merge', label: 'Review merge' },
  },
  threshold_tuning: {
    tune: { icon: 'controlsHorizontal', label: 'Review tuning' },
  },
  stale_rule: {
    delete: { icon: 'trash', label: 'Review deletion' },
    disable: { icon: 'eyeClosed', label: 'Review disable' },
    re_enable_and_tune: { icon: 'refresh', label: 'Review re-enable' },
  },
  coverage_gap: {
    create: { icon: 'plusInCircle', label: 'Review rule' },
  },
};

const getActionMeta = (
  type: string,
  action: string
): { icon: string; label: string } =>
  ACTION_LABELS[type]?.[action] ?? { icon: 'inspect', label: 'Review finding' };

interface FindingCardProps {
  finding: RuleDoctorFinding;
  analyzedAt?: string | null;
  showActions?: boolean;
}

const formatTimestamp = (dateStr: string): string => new Date(dateStr).toLocaleString();

export const FindingCard: React.FC<FindingCardProps> = ({ finding, analyzedAt, showActions = true }) => {
  const typeColor = getTypeColor(finding.type);
  const history = useHistory();
  const rulesApi = useService(RulesApi);
  const dismissMutation = useUpdateFindingStatus();
  const [ruleNames, setRuleNames] = useState<Map<string, string>>(new Map());
  const [loadingRules, setLoadingRules] = useState(false);

  useEffect(() => {
    if (finding.ruleIds.length === 0) return;

    let cancelled = false;
    setLoadingRules(true);

    rulesApi
      .getRulesByIds(finding.ruleIds)
      .then((response) => {
        if (cancelled) return;
        const names = new Map<string, string>();
        for (const rule of response.items) {
          names.set(rule.id, rule.metadata.name);
        }
        setRuleNames(names);
      })
      .catch(() => {
        // Fall back to showing raw IDs
      })
      .finally(() => {
        if (!cancelled) setLoadingRules(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rulesApi, finding.ruleIds]);

  return (
    <EuiPanel
      hasBorder
      css={css`
        border-left: 4px solid ${typeColor};
      `}
      grow={false}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color={typeColor}>{formatTypeName(finding.type)}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{finding.summary}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{finding.action}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      {finding.ruleIds.length > 0 && (
        <>
          <EuiSpacer size="s" />
          {loadingRules ? (
            <EuiLoadingSpinner size="s" />
          ) : (
            <EuiFlexGroup gutterSize="s" wrap responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <strong>Impacted rules</strong>
                </EuiText>
              </EuiFlexItem>
              {finding.ruleIds.map((id) => (
                <EuiFlexItem key={id} grow={false}>
                  <EuiBadge color="hollow">
                    <EuiLink href={paths.ruleDetails(id)}>
                      {ruleNames.get(id) ?? id}
                    </EuiLink>
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
        </>
      )}

      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        {finding.explanation}
      </EuiText>

      {analyzedAt && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            Last analyzed {formatTimestamp(analyzedAt)}
          </EuiText>
        </>
      )}

      {showActions && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType={getActionMeta(finding.type, finding.action).icon}
                onClick={() =>
                  history.push(`/doctor/fix/${encodeURIComponent(finding.id)}`, { finding })
                }
              >
                {getActionMeta(finding.type, finding.action).label}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="cross"
                color="text"
                isLoading={dismissMutation.isLoading}
                onClick={() =>
                  dismissMutation.mutate({ findingId: finding.id, status: 'dismissed' })
                }
              >
                Dismiss
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
};
