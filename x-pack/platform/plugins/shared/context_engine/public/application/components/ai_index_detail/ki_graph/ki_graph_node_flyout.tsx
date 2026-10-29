/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiListGroup,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import React, { useMemo } from 'react';
import { useKi } from '../../../hooks/use_ki';
import { useNavigation } from '../../../hooks/use_navigation';
import { getViewKiPath } from '../../../paths';
import { referenceNodeId, type KiGraph, type KiGraphNode } from '../../../utils/ki_graph';
import { ViewKiContentPanel } from '../../ki/view/content/view_ki_content_panel';
import { KiTypeDisplay } from '../../ki/shared/ki_type_display';
import { kiGraphLayerLabel } from './ki_graph_labels';

const MAX_LINKED_NODES = 50;
const TITLE_ID = 'contextKiGraphNodeFlyoutTitle';

interface KiGraphNodeFlyoutProps {
  aiIndexId: string;
  node: KiGraphNode;
  graph: KiGraph;
  groupColors: Map<string, string>;
  onSelect: (id: string) => void;
  onClose: () => void;
}

/** The node a reference points at, when the graph has one. */
const graphNodeForUri = (graph: KiGraph, uri: string): KiGraphNode | undefined => {
  const kiId = uri.startsWith('ki://') ? uri.slice('ki://'.length) : undefined;
  return graph.nodes.find(
    ({ id, kind }) => (kind === 'ki' && id === kiId) || id === referenceNodeId(uri)
  );
};

export const KiGraphNodeFlyout = ({
  aiIndexId,
  node,
  graph,
  groupColors,
  onSelect,
  onClose,
}: KiGraphNodeFlyoutProps) => {
  const { navigateToContextEngine } = useNavigation();
  const isKi = node.kind === 'ki';
  const { ki, isLoading, error } = useKi({
    aiIndexId,
    kiId: node.id,
    index: node.index ?? '',
    enabled: isKi && node.index !== undefined,
  });
  const document = ki?.document;

  const linked = useMemo(() => {
    const byId = new Map(graph.nodes.map((entry) => [entry.id, entry]));
    return [...(graph.neighbors.get(node.id) ?? [])]
      .flatMap((id) => byId.get(id) ?? [])
      .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label))
      .slice(0, MAX_LINKED_NODES);
  }, [graph, node.id]);

  return (
    <EuiFlyout
      size="s"
      type="overlay"
      ownFocus={false}
      onClose={onClose}
      aria-labelledby={TITLE_ID}
      data-test-subj="contextKiGraphNodeFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiHealth color={groupColors.get(node.group) ?? 'subdued'}>
              {kiGraphLayerLabel(node.group)}
            </EuiHealth>
          </EuiFlexItem>
          {node.type && (
            <EuiFlexItem grow={false}>
              <KiTypeDisplay type={node.type} as="badge" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiTitle size="s">
          <h2 id={TITLE_ID}>{node.label}</h2>
        </EuiTitle>
        {document?.description && (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p>{document.description}</p>
            </EuiText>
          </>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {node.kind === 'reference' && node.uri && (
          <>
            <EuiCode transparentBackground={false}>{node.uri}</EuiCode>
            <EuiSpacer size="m" />
          </>
        )}
        {isKi && error && (
          <KbnDangerCallout
            announceOnMount
            size="s"
            title={i18n.translate('xpack.contextEngine.kiGraph.flyout.loadError', {
              defaultMessage: 'Unable to load this Knowledge Indicator',
            })}
            text={error.message}
          />
        )}
        {isKi && !error && <ViewKiContentPanel document={document} isLoading={isLoading} />}
        {document?.tags && document.tags.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiBadgeGroup>
              {document.tags.map((tag) => (
                <EuiBadge key={tag} color="hollow">
                  {tag}
                </EuiBadge>
              ))}
            </EuiBadgeGroup>
          </>
        )}
        {document?.references && document.references.length > 0 && (
          <>
            <EuiSpacer size="l" />
            <EuiTitle size="xxs">
              <h3>
                <FormattedMessage
                  id="xpack.contextEngine.kiGraph.flyout.references"
                  defaultMessage="References"
                />
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup direction="column" gutterSize="xs">
              {document.references.map(({ uri, relation }, position) => {
                if (!uri) {
                  return null;
                }
                const target = graphNodeForUri(graph, uri);
                return (
                  <EuiFlexItem key={`${uri}-${position}`} grow={false}>
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      {relation && (
                        <EuiFlexItem grow={false}>
                          <EuiBadge color="hollow">{relation}</EuiBadge>
                        </EuiFlexItem>
                      )}
                      <EuiFlexItem>
                        <EuiText size="xs">
                          {target ? (
                            <EuiButtonEmpty
                              size="xs"
                              flush="left"
                              onClick={() => onSelect(target.id)}
                            >
                              {target.label}
                            </EuiButtonEmpty>
                          ) : (
                            uri
                          )}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </>
        )}
        {linked.length > 0 && (
          <>
            <EuiSpacer size="l" />
            <EuiTitle size="xxs">
              <h3>
                <FormattedMessage
                  id="xpack.contextEngine.kiGraph.flyout.linked"
                  defaultMessage="Linked in the graph ({count})"
                  values={{ count: graph.neighbors.get(node.id)?.size ?? 0 }}
                />
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiListGroup
              listItems={linked.map((entry) => ({
                label: entry.label,
                size: 's',
                onClick: () => onSelect(entry.id),
                icon: <EuiHealth color={groupColors.get(entry.group) ?? 'subdued'} />,
                'data-test-subj': 'contextKiGraphLinkedNode',
              }))}
            />
          </>
        )}
      </EuiFlyoutBody>
      {isKi && node.index && (
        <EuiFlyoutFooter>
          <EuiButton
            size="s"
            iconType="external"
            onClick={() =>
              navigateToContextEngine(getViewKiPath(aiIndexId, node.id), {
                index: node.index ?? '',
              })
            }
            data-test-subj="contextKiGraphOpenKi"
          >
            <FormattedMessage
              id="xpack.contextEngine.kiGraph.flyout.open"
              defaultMessage="Open Knowledge Indicator"
            />
          </EuiButton>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
};
