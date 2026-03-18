/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiLink,
  EuiTablePagination,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { RuleDetailFlyout } from './rule_detail_flyout';

export interface SuggestedRule {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium';
  type: string;
  impact: 'critical' | 'high' | 'medium';
  stream: string;
  knowledgeIndicators: string[];
  summary: string;
  query: string;
  rawDocument: string;
}

const SEVERITY_HEALTH_COLOR: Record<SuggestedRule['severity'], string> = {
  critical: 'danger',
  high: 'warning',
  medium: 'primary',
};

const SEVERITY_LABEL: Record<SuggestedRule['severity'], string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
};

export const MOCK_RULES: SuggestedRule[] = [
  {
    id: '1',
    name: 'SSH Authentication Failures',
    severity: 'critical',
    type: 'Incident',
    impact: 'critical',
    stream: 'logs.apache',
    knowledgeIndicators: ['openssh-service', 'k8s'],
    summary:
      'SSH authentication failures occur when a user tries to log in to a server using Secure Shell (SSH) but the server cannot verify the provided credentials (such as a password or SSH key).\nThis usually happens because of incorrect login details, missing/invalid SSH keys, or server security settings that block the connection.',
    query: 'FROM logs.otel.android,logs.otel.android.*\n| WHERE KQL("body.text:*crash*")',
    rawDocument:
      'Mar 12 10:02:05 combo sshd(pam_unix)[19937]: authentication failure; logname=\nuid=0 euid=0 tty=NODEVssh ruser=\nrhost=218.188.2.4',
  },
  {
    id: '2',
    name: 'Database Connection Error',
    severity: 'high',
    type: 'Incident',
    impact: 'high',
    stream: 'logs.postgresql',
    knowledgeIndicators: ['postgresql', 'connection-pool'],
    summary:
      'Database connection errors occur when the application cannot establish or maintain a connection to the database server. This can be caused by network issues, misconfiguration, or resource exhaustion.',
    query: 'FROM logs.postgresql.*\n| WHERE KQL("message:*connection refused*")',
    rawDocument:
      'Mar 12 10:15:33 db01 postgres[4521]: FATAL: remaining connection slots are reserved for non-replication superuser connections',
  },
  {
    id: '3',
    name: 'API Timeout',
    severity: 'medium',
    type: 'Performance',
    impact: 'medium',
    stream: 'logs.nginx',
    knowledgeIndicators: ['api-gateway', 'timeout'],
    summary:
      'API timeouts occur when a service fails to respond within the configured time limit. This can indicate backend slowness, high load, or network issues between services.',
    query: 'FROM logs.nginx.*\n| WHERE KQL("status:504 OR status:408")',
    rawDocument:
      'Mar 12 10:22:11 proxy nginx[1234]: 2024/03/12 10:22:11 [error] 1234#0: upstream timed out (110: Connection timed out) while reading response header from upstream',
  },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

interface SuggestedRulesFlyoutProps {
  onClose: () => void;
  onEnable: () => void;
  isEnabling: boolean;
  isEnabled: boolean;
}

export function SuggestedRulesFlyout({
  onClose,
  onEnable,
  isEnabling,
  isEnabled,
}: SuggestedRulesFlyoutProps) {
  const { euiTheme } = useEuiTheme();
  const [selectedRule, setSelectedRule] = useState<SuggestedRule | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const columns = [
    {
      field: 'expand' as const,
      name: '',
      width: '32px',
      render: (_: unknown, rule: SuggestedRule) => (
        <EuiButtonIcon
          iconType="expand"
          size="xs"
          color="text"
          aria-label={i18n.translate('xpack.streams.significantEvents.suggestedRules.viewDetails', {
            defaultMessage: 'View details for {name}',
            values: { name: rule.name },
          })}
          onClick={() => setSelectedRule(rule)}
          data-test-subj={`streamsSignificantEventsRuleDetails-${rule.id}`}
        />
      ),
    },
    {
      field: 'name' as const,
      name: i18n.translate('xpack.streams.significantEvents.suggestedRules.queriesColumn', {
        defaultMessage: 'Queries',
      }),
      render: (name: string, rule: SuggestedRule) => (
        <EuiLink onClick={() => setSelectedRule(rule)}>{name}</EuiLink>
      ),
    },
    {
      field: 'severity' as const,
      name: i18n.translate('xpack.streams.significantEvents.suggestedRules.severityColumn', {
        defaultMessage: 'Severity',
      }),
      width: '120px',
      render: (severity: SuggestedRule['severity']) => (
        <EuiHealth color={SEVERITY_HEALTH_COLOR[severity]}>{SEVERITY_LABEL[severity]}</EuiHealth>
      ),
    },
  ];

  return (
    <EuiFlyout
      // session="start" creates a new managed flyout session. Child flyouts nested
      // inside are automatically detected and rendered side-by-side by EUI.
      session="start"
      onClose={onClose}
      size={530}
      aria-labelledby="suggestedRulesFlyoutTitle"
      data-test-subj="streamsSignificantEventsSuggestedRulesFlyout"
      // flyoutMenuProps registers the session title (used for history navigation)
      // and enables the flyout menu bar which carries the close / back buttons.
      flyoutMenuProps={{
        title: i18n.translate('xpack.streams.significantEvents.suggestedRules.title', {
          defaultMessage: 'Suggested rules',
        }),
      }}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="suggestedRulesFlyoutTitle">
            {i18n.translate('xpack.streams.significantEvents.suggestedRules.title', {
              defaultMessage: 'Suggested rules',
            })}
          </h2>
        </EuiTitle>
        <EuiText
          size="s"
          css={css`
            margin-top: ${euiTheme.size.s};
          `}
        >
          <p>
            {i18n.translate('xpack.streams.significantEvents.suggestedRules.subtitle', {
              defaultMessage:
                'Once enabled, Elastic will start listening and generating Significant events.',
            })}
          </p>
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiBasicTable
          tableCaption={i18n.translate(
            'xpack.streams.significantEvents.suggestedRules.tableCaption',
            { defaultMessage: 'Suggested rules' }
          )}
          items={MOCK_RULES.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)}
          columns={columns}
          rowProps={(rule) => ({
            css: css`
              cursor: pointer;
              ${selectedRule?.id === rule.id
                ? `background: ${euiTheme.colors.backgroundBaseHighlight};`
                : ''}
            `,
          })}
        />
        <EuiTablePagination
          pageCount={Math.ceil(MOCK_RULES.length / pageSize)}
          activePage={pageIndex}
          onChangePage={setPageIndex}
          itemsPerPage={pageSize}
          itemsPerPageOptions={PAGE_SIZE_OPTIONS}
          onChangeItemsPerPage={(size) => {
            setPageSize(size);
            setPageIndex(0);
          }}
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              data-test-subj="streamsSignificantEventsSuggestedRulesCancel"
            >
              {i18n.translate('xpack.streams.significantEvents.suggestedRules.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {isEnabled ? (
              <EuiButton
                fill
                iconType="plusInCircle"
                data-test-subj="streamsSignificantEventsSuggestedRulesStartListening"
              >
                {i18n.translate('xpack.streams.significantEvents.suggestedRules.startListening', {
                  defaultMessage: 'Start listening',
                })}
              </EuiButton>
            ) : (
              <EuiButton
                fill
                isLoading={isEnabling}
                isDisabled={isEnabling}
                onClick={onEnable}
                data-test-subj="streamsSignificantEventsSuggestedRulesEnableAll"
              >
                {isEnabling
                  ? i18n.translate('xpack.streams.significantEvents.suggestedRules.enabling', {
                      defaultMessage: 'Loading',
                    })
                  : i18n.translate('xpack.streams.significantEvents.suggestedRules.enableAll', {
                      defaultMessage: 'Enable all',
                    })}
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>

      {/* Child flyout — nested inside parent so EUI session management renders them side-by-side */}
      {selectedRule && (
        <RuleDetailFlyout rule={selectedRule} onClose={() => setSelectedRule(null)} />
      )}
    </EuiFlyout>
  );
}
