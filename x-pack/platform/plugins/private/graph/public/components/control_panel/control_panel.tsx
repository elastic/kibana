/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { connect, useDispatch, useSelector, useStore } from 'react-redux';
import { type UseEuiTheme, useEuiShadow, euiFontSize } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ControlType, TermIntersect, UrlTemplate, WorkspaceField } from '../../types';
import { urlTemplateRegex } from '../../helpers/url_template';
import { SelectionToolBar } from './selection_tool_bar';
import { ControlPanelToolBar } from './control_panel_tool_bar';
import { SelectStyle } from './select_style';
import { SelectedNodeEditor } from './selected_node_editor';
import { MergeCandidates } from './merge_candidates';
import { DrillDowns } from './drill_downs';
import { DrillDownIconLinks } from './drill_down_icon_links';
import type { GraphState } from '../../state_management';
import {
  deselectNode,
  type GraphDispatch,
  liveResponseFieldsSelector,
  templatesSelector,
} from '../../state_management';
import { SelectedNodeItem, type SelectedNodeView } from './selected_node_item';
import { getIcon } from '../../helpers/style_choices';
import { gphSidebarHeaderStyles } from '../../styles';
import { createRuntimeGraphFromState } from '../../services/workspace/sync_runtime_topology';
import {
  areControlPanelWorkspacesEqual,
  controlPanelWorkspaceSelector,
} from './control_panel_workspace_selector';

export interface TargetOptions {
  toFields: WorkspaceField[];
}

interface ControlPanelProps {
  control: ControlType;
  selectedNodeId?: string;
  colors: string[];
  mergeCandidates: TermIntersect[];
  onSetControl: (control: ControlType) => void;
  selectSelected: (nodeId: string) => void;
}

interface ControlPanelStateProps {
  urlTemplates: UrlTemplate[];
  liveResponseFields: WorkspaceField[];
}

const ControlPanelComponent = ({
  liveResponseFields,
  urlTemplates,
  control,
  selectedNodeId,
  colors,
  mergeCandidates,
  onSetControl,
  selectSelected,
}: ControlPanelProps & ControlPanelStateProps) => {
  const dispatch = useDispatch<GraphDispatch>();
  const store = useStore<GraphState>();
  const workspaceState = useSelector(controlPanelWorkspaceSelector, areControlPanelWorkspacesEqual);
  const { nodeIds, nodesById, selectedNodeIds } = workspaceState;
  const childCounts = nodeIds.reduce<Record<string, number>>((counts, nodeId) => {
    const parentId = nodesById[nodeId].parentId;
    if (parentId) counts[parentId] = (counts[parentId] ?? 0) + 1;
    return counts;
  }, {});
  const selectedNodes = selectedNodeIds.map((nodeId): SelectedNodeView => {
    const node = nodesById[nodeId];
    return {
      ...node,
      icon: getIcon(node.icon ?? ''),
      numChildren: childCounts[nodeId] ?? 0,
    };
  });
  const hasNodes = nodeIds.length === 0;
  const selectedNode = selectedNodes.find(({ id }) => id === selectedNodeId);

  const openUrlTemplate = (template: UrlTemplate) => {
    const url = template.url;
    const newUrl = url.replace(
      urlTemplateRegex,
      template.encoder.encode(
        createRuntimeGraphFromState(store.getState().workspace),
        selectedNodeIds
      )
    );
    window.open(newUrl, '_blank', 'noopener,noreferrer');
  };

  const onSelectedFieldClick = (node: SelectedNodeView) => {
    selectSelected(node.id);
  };

  const onDeselectNode = (node: SelectedNodeView) => {
    dispatch(deselectNode(node.id));
    onSetControl('none');
  };

  return (
    <div
      id="sidebar"
      css={[
        css`
          ${useEuiShadow('m')};
        `,
        styles.gphSidebar,
      ]}
    >
      <ControlPanelToolBar liveResponseFields={liveResponseFields} onSetControl={onSetControl} />

      <div>
        <div css={gphSidebarHeaderStyles}>
          {i18n.translate('xpack.graph.sidebar.selectionsTitle', {
            defaultMessage: 'Selections',
          })}
        </div>
        <SelectionToolBar onSetControl={onSetControl} />
        <div css={styles.gphSelectionList}>
          {selectedNodes.length === 0 && (
            <p className="help-block">
              {i18n.translate('xpack.graph.sidebar.selections.noSelectionsHelpText', {
                defaultMessage: 'No selections. Click on vertices to add.',
              })}
            </p>
          )}

          {selectedNodes.map((node) => (
            <SelectedNodeItem
              key={node.id}
              node={node}
              isHighlighted={selectedNodeId === node.id}
              onSelectedFieldClick={onSelectedFieldClick}
              onDeselectNode={onDeselectNode}
            />
          ))}
        </div>
      </div>
      <DrillDownIconLinks
        urlTemplates={urlTemplates}
        hasNodes={hasNodes}
        openUrlTemplate={openUrlTemplate}
      />
      {control === 'drillDowns' && (
        <DrillDowns urlTemplates={urlTemplates} openUrlTemplate={openUrlTemplate} />
      )}
      {control === 'style' && selectedNodes.length > 0 && <SelectStyle colors={colors} />}
      {control === 'editLabel' && selectedNode && (
        <SelectedNodeEditor selectedNodes={selectedNodes} selectedNode={selectedNode} />
      )}
      {control === 'mergeTerms' && (
        <MergeCandidates mergeCandidates={mergeCandidates} onSetControl={onSetControl} />
      )}
    </div>
  );
};

const styles = {
  gphSidebar: (euiThemeContext: UseEuiTheme) =>
    css({
      position: 'absolute',
      right: euiThemeContext.euiTheme.size.s,
      top: euiThemeContext.euiTheme.size.s,
      width: `calc(${euiThemeContext.euiTheme.size.xl} * 10)`,
      zIndex: euiThemeContext.euiTheme.levels.flyout, // https://eui.elastic.co/#/theming/more-tokens#levels
      backgroundColor: euiThemeContext.euiTheme.colors.emptyShade,
      border: euiThemeContext.euiTheme.border.thin,
      padding: euiThemeContext.euiTheme.size.xs,
      borderRadius: euiThemeContext.euiTheme.border.radius.medium,
      opacity: 0.9,

      '.help-block': {
        fontSize: euiFontSize(euiThemeContext, 'xs', { unit: 'px' }).fontSize,
        color: euiThemeContext.euiTheme.colors.text,
      },
    }),

  gphSelectionList: ({ euiTheme }: UseEuiTheme) =>
    css({
      height: `calc(${euiTheme.size.l} * 10)`,
      backgroundColor: euiTheme.colors.lightestShade,
      overflow: 'auto',
      marginBottom: 0,
    }),
};

export const ControlPanel = connect((state: GraphState) => ({
  urlTemplates: templatesSelector(state),
  liveResponseFields: liveResponseFieldsSelector(state),
}))(ControlPanelComponent);
