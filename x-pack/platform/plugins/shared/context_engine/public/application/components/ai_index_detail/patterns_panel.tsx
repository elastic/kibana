/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSelect,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, useState } from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import type { Pattern } from '../../../../common/http_api/patterns';
import { usePatterns } from '../../hooks/use_patterns';
import { useSelfImprovement } from '../../hooks/use_self_improvement';
import { useTraceIndices } from '../../hooks/use_trace_indices';
import { humanizePatternType } from './pattern_format';
import { PatternRow } from './pattern_row';

interface PatternsPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
}

/**
 * Renders detected failure patterns (grouped by type) and lets the user enable
 * self-improvement by pointing it at a trace index. No "issue" concept — the
 * pattern is the actionable unit; improvements hang off it (Phase 4).
 */
export const PatternsPanel = ({ isLoading, aiIndex }: PatternsPanelProps) => {
  const aiIndexId = aiIndex?.id;
  const enabled = Boolean(aiIndex?.self_improvement?.enabled);
  const { patterns, isLoading: patternsLoading } = usePatterns(
    aiIndexId ?? '',
    Boolean(aiIndexId) && enabled
  );
  const { enable, disable } = useSelfImprovement(aiIndexId ?? '');
  const [tracesIndex, setTracesIndex] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const currentTracesIndex = aiIndex?.self_improvement?.traces_index;
  const { traceIndices, isLoading: traceIndicesLoading } = useTraceIndices(
    Boolean(aiIndexId) && !enabled
  );

  const byType = useMemo(() => {
    const map = new Map<string, Pattern[]>();
    for (const pattern of patterns) {
      const group = map.get(pattern.type) ?? [];
      group.push(pattern);
      map.set(pattern.type, group);
    }
    return [...map.entries()];
  }, [patterns]);

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextPatternsPanel">
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.patterns.title"
            defaultMessage="Patterns & improvements"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.patterns.description"
            defaultMessage="Failure patterns found in agent traces. Fix a pattern to create an improvement."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      {isLoading ? (
        <EuiSkeletonText lines={2} data-test-subj="contextPatternsLoading" />
      ) : !enabled ? (
        <EuiEmptyPrompt
          iconType="inspect"
          titleSize="xs"
          data-test-subj="contextPatternsDisabled"
          title={
            <h3>
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.patterns.disabledTitle"
                defaultMessage="Self-improvement is off"
              />
            </h3>
          }
          body={
            <>
              <p>
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.patterns.disabledBody"
                  defaultMessage="Point it at a trace index to start finding patterns from agent traces."
                />
              </p>
              <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiSelect
                    options={traceIndices.map((name) => ({ value: name, text: name }))}
                    value={tracesIndex}
                    onChange={(event) => setTracesIndex(event.target.value)}
                    hasNoInitialSelection
                    isLoading={traceIndicesLoading}
                    aria-label={i18n.translate(
                      'xpack.contextEngine.aiIndexDetail.patterns.traceIndexAriaLabel',
                      { defaultMessage: 'Trace index' }
                    )}
                    data-test-subj="contextSelfImprovementTracesIndex"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    onClick={() => enable.mutate(tracesIndex)}
                    isLoading={enable.isLoading}
                    isDisabled={!tracesIndex || !aiIndexId}
                    data-test-subj="contextEnableSelfImprovementButton"
                  >
                    <FormattedMessage
                      id="xpack.contextEngine.aiIndexDetail.patterns.enableButton"
                      defaultMessage="Enable"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>
          }
        />
      ) : (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.patterns.learningFrom"
                  defaultMessage="Learning from {index}"
                  values={{ index: <EuiCode>{currentTracesIndex}</EuiCode> }}
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                color="danger"
                iconType="refresh"
                onClick={() => setResetOpen(true)}
                isLoading={disable.isLoading}
                data-test-subj="contextResetSelfImprovementButton"
              >
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.patterns.reset"
                  defaultMessage="Reset / change trace index"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          {patternsLoading ? (
            <EuiSkeletonText lines={3} />
          ) : patterns.length === 0 ? (
            <EuiEmptyPrompt
              iconType="check"
              titleSize="xs"
              data-test-subj="contextPatternsEmpty"
              title={
                <h3>
                  <FormattedMessage
                    id="xpack.contextEngine.aiIndexDetail.patterns.emptyTitle"
                    defaultMessage="No patterns yet"
                  />
                </h3>
              }
              body={
                <p>
                  <FormattedMessage
                    id="xpack.contextEngine.aiIndexDetail.patterns.emptyBody"
                    defaultMessage="The case builder and classifier run on a schedule. Patterns appear here as traces are classified."
                  />
                </p>
              }
            />
          ) : (
            byType.map(([type, group]) => (
              <React.Fragment key={type}>
                <EuiText size="xs" color="subdued">
                  <strong>{humanizePatternType(type)}</strong>
                </EuiText>
                <EuiSpacer size="xs" />
                {group.map((pattern) => (
                  <React.Fragment key={pattern.pattern_key}>
                    <PatternRow aiIndexId={aiIndexId ?? ''} aiIndex={aiIndex} pattern={pattern} />
                    <EuiSpacer size="s" />
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))
          )}
        </>
      )}

      {resetOpen && (
        <EuiConfirmModal
          title={i18n.translate('xpack.contextEngine.aiIndexDetail.patterns.resetTitle', {
            defaultMessage: 'Reset self-improvement?',
          })}
          onCancel={() => setResetOpen(false)}
          onConfirm={() => {
            setResetOpen(false);
            disable.mutate();
          }}
          cancelButtonText={i18n.translate(
            'xpack.contextEngine.aiIndexDetail.patterns.resetCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.contextEngine.aiIndexDetail.patterns.resetConfirm',
            { defaultMessage: 'Reset' }
          )}
          buttonColor="danger"
          data-test-subj="contextResetSelfImprovementModal"
        >
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.patterns.resetBody"
            defaultMessage="This turns off self-improvement and permanently removes all cases, patterns, and improvements built for this AI index. You can then point it at a different trace index."
          />
        </EuiConfirmModal>
      )}
    </EuiPanel>
  );
};
