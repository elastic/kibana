/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { parseMermaidDecisionTree } from '@kbn/nightshift-decision-trees';
import { ChangesPanel } from './changes_panel';
import { EdgesTable } from './edges_table';
import { getDecisionTreeStatusLabel } from './labels';
import { LearningsPanel } from './learnings_panel';
import { MermaidPanel } from './mermaid_panel';
import { NodesTable } from './nodes_table';
import { VersionHistory } from './version_history';
import { useDecisionTree, useDecisionTreeVersions } from './use_decision_trees';

interface TreeViewProps {
  symptom: string;
}

const Section = ({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) => (
  <>
    <EuiSpacer size="l" />
    <EuiAccordion
      id={`nightshiftDecisionTreeSection-${id}`}
      initialIsOpen
      paddingSize="s"
      buttonContent={
        <EuiTitle size="xs">
          <h3>{title}</h3>
        </EuiTitle>
      }
    >
      <EuiSpacer size="s" />
      {children}
    </EuiAccordion>
  </>
);

export function TreeView({ symptom }: TreeViewProps) {
  const { data: treeData, isLoading, isError } = useDecisionTree(symptom);
  const { data: versionsData } = useDecisionTreeVersions(symptom);
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(undefined);

  useEffect(() => {
    setSelectedVersion(undefined);
  }, [symptom]);

  const tree = treeData?.tree;
  const versions = versionsData?.versions ?? [];

  const parsed = useMemo(
    () => (tree ? parseMermaidDecisionTree(tree.mermaid, tree.tree_id) : undefined),
    [tree]
  );

  const activeVersion = selectedVersion ?? tree?.version;

  if (isLoading) {
    return <EuiLoadingSpinner size="l" data-test-subj="nightshiftDecisionTreeLoading" />;
  }

  if (isError || !tree) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        title={
          <h2>
            <FormattedMessage
              id="xpack.significantEventsApp.decisionTrees.notFoundTitle"
              defaultMessage="Tree not found"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.significantEventsApp.decisionTrees.notFoundDescription"
              defaultMessage="This decision tree could not be loaded."
            />
          </p>
        }
      />
    );
  }

  return (
    <div data-test-subj="nightshiftDecisionTreeView">
      <EuiTitle size="m">
        <h2>{tree.title}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
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
            <code>{tree.tree_id}</code>
            {' · '}
            <FormattedMessage
              id="xpack.significantEventsApp.decisionTrees.updatedLabel"
              defaultMessage="Updated {when}"
              values={{ when: <FormattedRelative value={tree.updated_at} /> }}
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <Section
        id="versionHistory"
        title={i18n.translate('xpack.significantEventsApp.decisionTrees.sections.versionHistory', {
          defaultMessage: 'Version history',
        })}
      >
        <VersionHistory
          versions={versions}
          selectedVersion={activeVersion}
          onSelectVersion={setSelectedVersion}
        />
      </Section>

      {activeVersion !== undefined && (
        <Section
          id="changes"
          title={i18n.translate('xpack.significantEventsApp.decisionTrees.sections.changes', {
            defaultMessage: 'Changes in v{version}',
            values: { version: activeVersion },
          })}
        >
          <ChangesPanel symptom={symptom} version={activeVersion} />
        </Section>
      )}

      <Section
        id="learnings"
        title={i18n.translate('xpack.significantEventsApp.decisionTrees.sections.learnings', {
          defaultMessage: 'Learnings',
        })}
      >
        <LearningsPanel learnings={tree.learnings} />
      </Section>

      <Section
        id="nodes"
        title={i18n.translate('xpack.significantEventsApp.decisionTrees.sections.nodes', {
          defaultMessage: 'Nodes',
        })}
      >
        <NodesTable nodes={parsed?.nodes ?? []} />
      </Section>

      <Section
        id="edges"
        title={i18n.translate('xpack.significantEventsApp.decisionTrees.sections.edges', {
          defaultMessage: 'Edges',
        })}
      >
        <EdgesTable edges={parsed?.edges ?? []} />
      </Section>

      <Section
        id="mermaid"
        title={i18n.translate('xpack.significantEventsApp.decisionTrees.sections.mermaid', {
          defaultMessage: 'Mermaid source',
        })}
      >
        <MermaidPanel mermaid={tree.mermaid} />
      </Section>
    </div>
  );
}
