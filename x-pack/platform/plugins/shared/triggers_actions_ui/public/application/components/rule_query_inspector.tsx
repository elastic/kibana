/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
} from '@elastic/eui';
import type { EuiTabbedContentTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';

import { useKibana } from '../../common/lib/kibana';

interface QueryInspectorResult {
  index: string;
  request: Record<string, unknown>;
  response?: Record<string, unknown>;
  label?: string;
}

interface QueryInspectorResponse {
  queries: QueryInspectorResult[];
}

const stringify = (obj: Record<string, unknown> | undefined): string => {
  if (!obj) return '';
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return '{}';
  }
};

export interface RuleQueryInspectorFlyoutProps {
  ruleId: string;
  onClose: () => void;
  evaluationTimeRange?: { gte: string; lte: string };
}

export function RuleQueryInspectorFlyout({
  ruleId,
  onClose,
  evaluationTimeRange,
}: RuleQueryInspectorFlyoutProps) {
  const { http } = useKibana().services;
  const [mode, setMode] = useState<'build' | 'execute'>('build');
  const [selectedTabId, setSelectedTabId] = useState('request');
  const [selectedCriterion, setSelectedCriterion] = useState(0);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      'ruleQueryInspector',
      ruleId,
      mode,
      evaluationTimeRange?.gte,
      evaluationTimeRange?.lte,
    ],
    queryFn: ({ signal }) =>
      http.get<QueryInspectorResponse>(
        `${BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(ruleId)}/query_inspector`,
        {
          query: {
            mode,
            ...(evaluationTimeRange
              ? { start: evaluationTimeRange.gte, end: evaluationTimeRange.lte }
              : {}),
          },
          signal,
        }
      ),
    enabled: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    refetch();
  }, [refetch, mode]);

  const handleTabClick = useCallback(
    (tab: EuiTabbedContentTab) => {
      setSelectedTabId(tab.id);
      if (tab.id === 'response' && mode === 'build') {
        setMode('execute');
      }
    },
    [mode]
  );

  const queries = data?.queries ?? [];
  const currentQuery = queries[selectedCriterion];
  const hasMultipleCriteria = queries.length > 1;

  const criterionOptions = queries.map((q, idx) => ({
    value: String(idx),
    text: q.label ?? `Query ${idx + 1}`,
  }));

  const tabs: EuiTabbedContentTab[] = [
    {
      id: 'request',
      name: i18n.translate('xpack.triggersActionsUI.ruleQueryInspector.requestTab', {
        defaultMessage: 'Request',
      }),
      content: (
        <>
          <EuiSpacer />
          <EuiCodeBlock language="json" fontSize="m" paddingSize="m" isCopyable>
            {currentQuery ? stringify(currentQuery.request) : ''}
          </EuiCodeBlock>
        </>
      ),
    },
    {
      id: 'response',
      name: i18n.translate('xpack.triggersActionsUI.ruleQueryInspector.responseTab', {
        defaultMessage: 'Response',
      }),
      content: (
        <>
          <EuiSpacer />
          {mode !== 'execute' || isLoading ? (
            <EuiFlexGroup justifyContent="center" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="l" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <EuiCodeBlock language="json" fontSize="m" paddingSize="m" isCopyable>
              {currentQuery ? stringify(currentQuery.response) : ''}
            </EuiCodeBlock>
          )}
        </>
      ),
    },
  ];

  return (
    <EuiFlyout
      onClose={onClose}
      data-test-subj="ruleQueryInspectorFlyout"
      size="m"
      ownFocus
      aria-labelledby="ruleQueryInspectorTitle"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="ruleQueryInspectorTitle">
            {i18n.translate('xpack.triggersActionsUI.ruleQueryInspector.title', {
              defaultMessage: 'Inspect',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {isLoading && mode === 'build' && (
          <EuiFlexGroup justifyContent="center" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        {isError && (
          <EuiCallOut
            color="danger"
            announceOnMount
            title={i18n.translate('xpack.triggersActionsUI.ruleQueryInspector.errorTitle', {
              defaultMessage: 'Unable to load query',
            })}
          >
            {error instanceof Error ? error.message : String(error)}
          </EuiCallOut>
        )}

        {!(isLoading && mode === 'build') && !isError && queries.length > 0 && (
          <>
            {hasMultipleCriteria && (
              <>
                <EuiSelect
                  options={criterionOptions}
                  value={String(selectedCriterion)}
                  onChange={(e) => setSelectedCriterion(Number(e.target.value))}
                  aria-label={i18n.translate(
                    'xpack.triggersActionsUI.ruleQueryInspector.criterionSelectLabel',
                    { defaultMessage: 'Select criterion' }
                  )}
                  data-test-subj="ruleQueryInspectorCriterionSelect"
                />
                <EuiSpacer size="m" />
              </>
            )}
            <EuiTabbedContent
              tabs={tabs}
              selectedTab={tabs.find((t) => t.id === selectedTabId) ?? tabs[0]}
              onTabClick={handleTabClick}
            />
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}

const SUPPORTED_RULE_TYPES = new Set([OBSERVABILITY_THRESHOLD_RULE_TYPE_ID]);

export interface RuleQueryInspectorProps {
  ruleId: string;
  ruleTypeId: string;
  evaluationTimeRange?: { gte: string; lte: string };
}

export function RuleQueryInspector({
  ruleId,
  ruleTypeId,
  evaluationTimeRange,
}: RuleQueryInspectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!SUPPORTED_RULE_TYPES.has(ruleTypeId)) {
    return null;
  }

  return (
    <>
      <EuiButtonEmpty
        data-test-subj="ruleQueryInspectorButton"
        iconType="inspect"
        onClick={() => setIsOpen(true)}
      >
        {i18n.translate('xpack.triggersActionsUI.ruleQueryInspector.buttonLabel', {
          defaultMessage: 'Inspect',
        })}
      </EuiButtonEmpty>
      {isOpen && (
        <RuleQueryInspectorFlyout
          ruleId={ruleId}
          onClose={() => setIsOpen(false)}
          evaluationTimeRange={evaluationTimeRange}
        />
      )}
    </>
  );
}
