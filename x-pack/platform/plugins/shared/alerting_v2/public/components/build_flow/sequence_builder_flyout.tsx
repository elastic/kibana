/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldSearch,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ColorMode, ReactFlowInstance } from '@xyflow/react';
import { Background, Controls, Panel, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import { useFetchRules } from '../../hooks/use_fetch_rules';
import type { RuleApiResponse } from '../../services/rules_api';
import { buildFlowRuleData } from '../../queries/build_flow/build_flow_rule';
import { layoutSequence } from './layout_sequence';
import { SequenceNode } from './sequence_node';
import { SequenceEdge } from './sequence_edge';
import { DEFAULT_HOP_WINDOW } from './window_options';

const nodeTypes = { sequenceStage: SequenceNode };
const edgeTypes = { sequenceHop: SequenceEdge };

const RULE_DRAG_MIME_TYPE = 'application/x-alerting-v2-rule-id';

export interface SequenceBuilderFlyoutProps {
  isSaving: boolean;
  onClose: () => void;
  onCreate: (payload: CreateRuleData) => void;
}

export const SequenceBuilderFlyout: React.FC<SequenceBuilderFlyoutProps> = ({
  isSaving,
  onClose,
  onCreate,
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'sequenceBuilderTitle' });
  const { colorMode } = useEuiTheme();
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

  const [search, setSearch] = useState('');
  const [stages, setStages] = useState<
    Array<{ ruleId: string; ruleName: string; groupingFields: string[] }>
  >([]);
  // One window per hop between consecutive stages — each relationship is
  // independently configurable, not one global window for the sequence.
  const [hopWindows, setHopWindows] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  // Whole-flow correlation key (v1: single field, exact-match across every
  // stage's own `grouping.fields` — see build_flow_rule.ts module doc for
  // why this is `group_hash`-based and why it can't yet do partial/per-hop
  // correlation). Undefined = today's default: fires for any matching
  // instances, globally, uncorrelated.
  const [correlateBy, setCorrelateBy] = useState<string | undefined>(undefined);

  const { data: rulesData } = useFetchRules({ page: 1, perPage: 100, search: search || undefined });
  const availableRules = useMemo(
    () => (rulesData?.items ?? []).filter((r) => !stages.some((s) => s.ruleId === r.id)),
    [rulesData, stages]
  );

  const addStage = useCallback(
    (rule: RuleApiResponse) => {
      setStages((prev) => {
        if (prev.some((s) => s.ruleId === rule.id)) return prev;
        const next = [
          ...prev,
          {
            ruleId: rule.id,
            ruleName: rule.metadata?.name ?? rule.id,
            groupingFields: rule.grouping?.fields ?? [],
          },
        ];
        if (!nameEdited) {
          setName(next.map((s) => s.ruleName).join(' → '));
        }
        return next;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [nameEdited]
  );

  // Offerable only when every stage's grouping.fields is *exactly* the same
  // single-field set — group_hash correlation is all-or-nothing across the
  // whole field set, not a loose intersection (see build_flow_rule.ts).
  // Multi-field grouping sets are excluded from v1's UI for simplicity, even
  // though they'd technically hash-match if identical everywhere.
  const commonGroupingField = useMemo(() => {
    if (stages.length < 2) return undefined;
    const [first, ...rest] = stages;
    if (first.groupingFields.length !== 1) return undefined;
    const candidate = first.groupingFields[0];
    const allMatch = rest.every(
      (s) => s.groupingFields.length === 1 && s.groupingFields[0] === candidate
    );
    return allMatch ? candidate : undefined;
  }, [stages]);

  // Clear the selection if it's no longer offerable (e.g. a stage with a
  // different/no grouping field was added or removed).
  useEffect(() => {
    if (correlateBy && correlateBy !== commonGroupingField) {
      setCorrelateBy(undefined);
    }
  }, [correlateBy, commonGroupingField]);

  // Keep hopWindows in sync with stages.length - 1 (one entry per hop),
  // preserving already-set windows when stages are added/removed.
  useEffect(() => {
    const neededHops = Math.max(0, stages.length - 1);
    setHopWindows((prev) => {
      if (prev.length === neededHops) return prev;
      if (prev.length < neededHops) {
        return [...prev, ...Array(neededHops - prev.length).fill(DEFAULT_HOP_WINDOW)];
      }
      return prev.slice(0, neededHops);
    });
  }, [stages.length]);

  const removeStage = useCallback(
    (ruleId: string) => {
      setStages((prev) => {
        const next = prev.filter((s) => s.ruleId !== ruleId);
        if (!nameEdited) {
          setName(next.map((s) => s.ruleName).join(' → '));
        }
        return next;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [nameEdited]
  );

  const onHopWindowChange = useCallback((hopIndex: number, value: string) => {
    setHopWindows((prev) => prev.map((w, i) => (i === hopIndex ? value : w)));
  }, []);

  // Bumped on any click elsewhere in the canvas so open hop-window popovers
  // close — React Flow's pane swallows the pointer event before it reaches
  // EUI's document-level outside-click detector, so we signal edges directly.
  const [closeAllHopPopoversTick, setCloseAllHopPopoversTick] = useState(0);
  const closeAllHopPopovers = useCallback(() => setCloseAllHopPopoversTick((t) => t + 1), []);

  const { nodes, edges } = useMemo(
    () => layoutSequence(stages, hopWindows, removeStage, onHopWindowChange, closeAllHopPopoversTick),
    [stages, hopWindows, removeStage, onHopWindowChange, closeAllHopPopoversTick]
  );

  // Auto-fit the view every time a stage is added or removed, so the whole
  // sequence stays visible without the user manually zooming/panning.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      reactFlowInstanceRef.current?.fitView({ padding: 0.4, duration: 300, maxZoom: 1.2 });
    });
    return () => cancelAnimationFrame(raf);
  }, [nodes.length]);

  const canCreate =
    stages.length >= 2 && hopWindows.length === stages.length - 1 && name.trim().length > 0;

  const preview = useMemo(() => {
    if (!canCreate) return null;
    return buildFlowRuleData({
      name,
      ruleIds: stages.map((s) => s.ruleId),
      hopWindows,
      correlateBy,
    });
  }, [canCreate, name, stages, hopWindows, correlateBy]);

  const handleDropOnCanvas = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const ruleId = event.dataTransfer.getData(RULE_DRAG_MIME_TYPE);
      const rule = availableRules.find((r) => r.id === ruleId);
      if (rule) addStage(rule);
    },
    [availableRules, addStage]
  );

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={titleId}
      size="90%"
      data-test-subj="sequenceBuilderFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            <FormattedMessage
              id="xpack.alertingV2.sequenceBuilder.title"
              defaultMessage="Build a Sequence"
            />
          </h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.alertingV2.sequenceBuilder.subtitle"
            defaultMessage="Drag rules from the left, in order, to build a new rule that fires when they occur in sequence. Each arrow has its own time window. None of the source rules are modified."
          />
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={{ '.euiFlyoutBody__overflowContent': { height: '100%', padding: 0 } }}>
        <EuiFlexGroup css={{ height: '100%' }} gutterSize="none">
          <EuiFlexItem grow={false} css={{ width: 300, borderRight: '1px solid #d3dae6' }}>
            <EuiPanel paddingSize="m" hasShadow={false} css={{ height: '100%', overflowY: 'auto' }}>
              <EuiFieldSearch
                fullWidth
                isClearable
                placeholder={i18n.translate('xpack.alertingV2.sequenceBuilder.searchPlaceholder', {
                  defaultMessage: 'Search rules',
                })}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-test-subj="sequenceBuilderRuleSearch"
              />
              <EuiSpacer size="m" />
              <EuiFlexGroup direction="column" gutterSize="s">
                {availableRules.map((rule) => (
                  <EuiFlexItem key={rule.id} grow={false}>
                    <EuiPanel
                      paddingSize="s"
                      hasBorder
                      draggable
                      onDragStart={(e: React.DragEvent) => {
                        e.dataTransfer.setData(RULE_DRAG_MIME_TYPE, rule.id);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onDoubleClick={() => addStage(rule)}
                      css={{ cursor: 'grab' }}
                      data-test-subj={`sequenceBuilderDraggableRule-${rule.id}`}
                    >
                      <EuiText size="s">{rule.metadata?.name ?? rule.id}</EuiText>
                    </EuiPanel>
                  </EuiFlexItem>
                ))}
                {availableRules.length === 0 ? (
                  <EuiText size="xs" color="subdued">
                    <FormattedMessage
                      id="xpack.alertingV2.sequenceBuilder.noMoreRules"
                      defaultMessage="No more rules to add."
                    />
                  </EuiText>
                ) : null}
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem
            css={{ height: '100%' }}
            onDragOver={(e: React.DragEvent) => e.preventDefault()}
            onDrop={handleDropOnCanvas}
            data-test-subj="sequenceBuilderCanvas"
          >
            {/* ReactFlow stays mounted even with zero nodes — mounting it fresh
                the moment the first (edge-less) node appears left that node
                permanently stuck at visibility:hidden (React Flow's own
                "not yet measured" state never resolved for a lone node with
                no edges at initial mount, though later-added nodes recovered
                fine via a different code path). Mounting once, always, with
                an overlay for the empty state, sidesteps that entirely. */}
            <ReactFlowProvider>
              <ReactFlow
                onInit={(instance) => {
                  reactFlowInstanceRef.current = instance;
                }}
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{ padding: 0.4 }}
                nodesDraggable={false}
                nodesConnectable={false}
                onPaneClick={closeAllHopPopovers}
                onNodeClick={closeAllHopPopovers}
                onMoveStart={closeAllHopPopovers}
                proOptions={{ hideAttribution: true }}
                colorMode={colorMode.toLowerCase() as ColorMode}
              >
                <Controls showInteractive={false} />
                <Background />
                {stages.length === 0 ? (
                  <Panel position="top-center" style={{ marginTop: '40%' }}>
                    <EuiText color="subdued">
                      <FormattedMessage
                        id="xpack.alertingV2.sequenceBuilder.emptyCanvas"
                        defaultMessage="Drag rules here, in the order you want them to occur"
                      />
                    </EuiText>
                  </Panel>
                ) : null}
              </ReactFlow>
            </ReactFlowProvider>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate('xpack.alertingV2.sequenceBuilder.nameLabel', {
                defaultMessage: 'Sequence name',
              })}
              display="rowCompressed"
            >
              <EuiFieldText
                compressed
                value={name}
                onChange={(e) => {
                  setNameEdited(true);
                  setName(e.target.value);
                }}
                data-test-subj="sequenceBuilderNameInput"
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={{ width: 220 }}>
            <EuiFormRow
              label={i18n.translate('xpack.alertingV2.sequenceBuilder.correlateByLabel', {
                defaultMessage: 'Correlate by',
              })}
              display="rowCompressed"
              helpText={
                commonGroupingField
                  ? undefined
                  : i18n.translate('xpack.alertingV2.sequenceBuilder.correlateByHelp', {
                      defaultMessage: 'No grouping field is shared by every stage.',
                    })
              }
            >
              <EuiSelect
                compressed
                disabled={!commonGroupingField}
                options={[
                  {
                    value: '',
                    text: i18n.translate('xpack.alertingV2.sequenceBuilder.correlateByNone', {
                      defaultMessage: 'None (any matching instances)',
                    }),
                  },
                  ...(commonGroupingField
                    ? [{ value: commonGroupingField, text: commonGroupingField }]
                    : []),
                ]}
                value={correlateBy ?? ''}
                onChange={(e) => setCorrelateBy(e.target.value || undefined)}
                data-test-subj="sequenceBuilderCorrelateBySelect"
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="sequenceBuilderCancel">
              <FormattedMessage id="xpack.alertingV2.sequenceBuilder.cancel" defaultMessage="Cancel" />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isDisabled={!canCreate}
              isLoading={isSaving}
              onClick={() => preview && onCreate(preview)}
              data-test-subj="sequenceBuilderSubmit"
            >
              <FormattedMessage
                id="xpack.alertingV2.sequenceBuilder.submit"
                defaultMessage="Create sequence rule"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        {stages.length === 1 ? (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut
              size="s"
              color="subdued"
              title={i18n.translate('xpack.alertingV2.sequenceBuilder.needTwoStages', {
                defaultMessage: 'Add at least one more rule to create a sequence.',
              })}
            />
          </>
        ) : null}
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
