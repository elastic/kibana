/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFocusTrap, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  getStepByNameFromNestedSteps,
  transformWorkflowToGraph,
  type TransformResult,
  type WorkflowYaml,
} from '@kbn/workflows';
import {
  ReactFlowProvider,
  type RenderStepIcon,
  TypeIcon,
  WorkflowDetailBottomBar,
  type WorkflowDetailBottomBarView,
  WorkflowGraphCanvasWithoutProvider,
  WorkflowVisualEditorFlyout,
  type WorkflowVisualEditorFlyoutTarget,
  WorkflowYamlPreview,
} from '@kbn/workflows-ui';

interface ParsedWorkflow {
  workflow: WorkflowYaml;
  transformed: TransformResult;
}

/**
 * Parses the YAML into a graph-ready workflow. Returns `undefined` for invalid
 * YAML, or for a valid document with the wrong shape (e.g. `steps:` as a
 * mapping), which the graph cannot iterate.
 */
export const parseWorkflowForGraph = (yaml: string): ParsedWorkflow | undefined => {
  try {
    const parsed = parseYaml(yaml);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !(parsed.steps === undefined || Array.isArray(parsed.steps)) ||
      !(parsed.triggers === undefined || Array.isArray(parsed.triggers))
    ) {
      return undefined;
    }
    const workflow = parsed as WorkflowYaml;
    return { workflow, transformed: transformWorkflowToGraph(workflow) };
  } catch {
    return undefined;
  }
};

const renderStepIcon: RenderStepIcon = ({ stepType, isTrigger, size, color }) => (
  <TypeIcon type={stepType} kind={isTrigger ? 'trigger' : 'step'} size={size} color={color} />
);

/**
 * Read-only workflow preview with a YAML / graph toggle, the same layout as the
 * workflow library template page. Clicking a graph node opens its step details.
 * With `showGraph` false (experimental features off), it shows the YAML only.
 */
export const WorkflowYamlCanvasPreview: React.FC<{ yaml: string; showGraph: boolean }> = ({
  yaml,
  showGraph,
}) => {
  const { euiTheme } = useEuiTheme();
  const [view, setView] = useState<WorkflowDetailBottomBarView>('graph');
  const [selectedStepId, setSelectedStepId] = useState<string | undefined>();
  const flyoutPanelRef = useRef<HTMLDivElement | null>(null);

  const parsed = useMemo(
    () => (showGraph ? parseWorkflowForGraph(yaml) : undefined),
    [yaml, showGraph]
  );

  const activeView = parsed ? view : 'yaml';

  const selectedTarget = useMemo<WorkflowVisualEditorFlyoutTarget | undefined>(() => {
    if (!selectedStepId || !parsed) {
      return undefined;
    }
    const { workflow, transformed } = parsed;
    const ref = transformed.nodeRefs[selectedStepId];
    if (!ref) {
      return undefined;
    }

    if (ref.kind === 'trigger') {
      const trigger = workflow.triggers?.[ref.triggerIndex];
      if (!trigger) {
        return undefined;
      }
      // Reuse the graph node's label so the flyout title matches the node.
      const node = transformed.nodes.find(({ id }) => id === selectedStepId);
      return {
        kind: 'trigger',
        triggerType: ref.triggerType,
        triggerLabel: node?.type === 'trigger' ? node.data.label : ref.triggerType,
        yamlSnippet: stringifyYaml({ triggers: [trigger] }).trimEnd(),
      };
    }

    const step = getStepByNameFromNestedSteps(workflow.steps, ref.stepName);
    if (!step) {
      return undefined;
    }
    return {
      kind: 'step',
      stepName: ref.stepName,
      stepType: step.type,
      yamlSnippet: stringifyYaml([step]).trimEnd(),
    };
  }, [selectedStepId, parsed]);

  const closeFlyout = useCallback(() => setSelectedStepId(undefined), []);
  const openTargetInYaml = useCallback(() => {
    setView('yaml');
    closeFlyout();
  }, [closeFlyout]);
  const handleFlyoutKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeFlyout();
      }
    },
    [closeFlyout]
  );

  useEffect(() => {
    if (selectedTarget) {
      flyoutPanelRef.current?.focus();
    }
  }, [selectedTarget]);

  return (
    <div
      css={css`
        position: relative;
        height: 100%;
        min-height: 400px;
        width: 100%;
      `}
      data-test-subj="workflowYamlCanvasPreview"
    >
      {activeView === 'graph' && parsed ? (
        <ReactFlowProvider>
          <WorkflowGraphCanvasWithoutProvider
            workflow={parsed.workflow}
            transformed={parsed.transformed}
            isYamlValid={true}
            selectedStepId={selectedStepId}
            onStepSelect={setSelectedStepId}
            canRunSteps={false}
            renderStepIcon={renderStepIcon}
            fitView={true}
            fitViewOptions={{ padding: 0.35, minZoom: 0.2, maxZoom: 1.2 }}
            showZoomControls={true}
          />
        </ReactFlowProvider>
      ) : (
        <WorkflowYamlPreview
          yaml={yaml}
          height="100%"
          data-test-subj="workflowYamlCanvasPreview-yaml"
        />
      )}
      {showGraph ? (
        <WorkflowDetailBottomBar
          editorView={activeView}
          onEditorViewChange={setView}
          disableAutoCollapse={true}
          showViewToggle={Boolean(parsed)}
        />
      ) : null}
      {activeView === 'graph' && selectedTarget ? (
        <EuiFocusTrap returnFocus>
          <div
            ref={flyoutPanelRef}
            tabIndex={-1}
            onKeyDown={handleFlyoutKeyDown}
            css={{
              position: 'absolute',
              top: euiTheme.size.s,
              right: euiTheme.size.s,
              bottom: euiTheme.size.s,
              width: 420,
              maxWidth: `calc(100% - ${euiTheme.size.base})`,
              zIndex: euiTheme.levels.flyout,
              boxShadow:
                '0 0 2px 0 rgba(43, 57, 79, 0.16), 0 4px 13px 0 rgba(43, 57, 79, 0.12), 0 8px 17px 0 rgba(43, 57, 79, 0.07)',
              borderRadius: euiTheme.border.radius.medium,
              overflow: 'hidden',
              outline: 'none',
            }}
            data-test-subj="workflowYamlCanvasPreview-stepFlyout"
          >
            <WorkflowVisualEditorFlyout
              target={selectedTarget}
              editorYaml={yaml}
              canExecuteWorkflow={false}
              isYamlValid={true}
              onClose={closeFlyout}
              onOpenInYaml={openTargetInYaml}
              renderStepIcon={renderStepIcon}
            />
          </div>
        </EuiFocusTrap>
      ) : null}
    </div>
  );
};
