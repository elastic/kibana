/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { getDecisionTreeStatusLabel } from './labels';
import type { DecisionTreeStats, DecisionTreeSummary } from './types';

interface DecisionTreeHomeProps {
  trees: DecisionTreeSummary[];
  stats: DecisionTreeStats;
  onSelectTree: (symptom: string) => void;
}

export function DecisionTreeHome({ trees, stats, onSelectTree }: DecisionTreeHomeProps) {
  if (trees.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="branch"
        title={
          <h2>
            <FormattedMessage
              id="xpack.significantEventsApp.decisionTrees.emptyTitle"
              defaultMessage="No decision trees yet"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.significantEventsApp.decisionTrees.emptyDescription"
              defaultMessage="Decision trees are built by the reinforcement agent after investigations run. Once an investigation completes, the tree for its symptom appears here."
            />
          </p>
        }
        data-test-subj="nightshiftDecisionTreeEmpty"
      />
    );
  }

  return (
    <div data-test-subj="nightshiftDecisionTreeHome">
      <EuiTitle size="m">
        <h2>
          <FormattedMessage
            id="xpack.significantEventsApp.decisionTrees.overviewTitle"
            defaultMessage="Decision Trees"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <EuiPanel hasBorder hasShadow={false} paddingSize="m">
            <EuiStat
              title={stats.total}
              description={i18n.translate(
                'xpack.significantEventsApp.decisionTrees.stats.total',
                { defaultMessage: 'Trees' }
              )}
              titleSize="l"
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder hasShadow={false} paddingSize="m">
            <EuiStat
              title={stats.established}
              description={i18n.translate(
                'xpack.significantEventsApp.decisionTrees.stats.established',
                { defaultMessage: 'Established' }
              )}
              titleSize="l"
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder hasShadow={false} paddingSize="m">
            <EuiStat
              title={stats.total_versions}
              description={i18n.translate(
                'xpack.significantEventsApp.decisionTrees.stats.versions',
                { defaultMessage: 'Versions' }
              )}
              titleSize="l"
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.significantEventsApp.decisionTrees.allTreesTitle"
            defaultMessage="All trees"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="column" gutterSize="s">
        {trees.map((tree) => (
          <EuiFlexItem key={tree.tree_id} grow={false}>
            <EuiPanel
              hasBorder
              hasShadow={false}
              paddingSize="m"
              onClick={() => onSelectTree(tree.symptom)}
              data-test-subj={`nightshiftDecisionTreeCard-${tree.symptom}`}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>{tree.title}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={tree.status === 'established' ? 'success' : 'hollow'}>
                    {getDecisionTreeStatusLabel(tree.status)}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{`v${tree.version}`}</EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <FormattedRelative value={tree.updated_at} />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
}
