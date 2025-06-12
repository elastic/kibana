/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { connect } from 'react-redux';
import { type UseEuiTheme, useEuiShadow, euiFontSize } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  ControlType,
  TermIntersect,
  UrlTemplate,
  Workspace,
  WorkspaceField,
  WorkspaceNode,
} from '../../types';
import { urlTemplateRegex } from '../../helpers/url_template';
import { SelectionToolBar } from './selection_tool_bar';
import { ControlPanelToolBar } from './control_panel_tool_bar';
import { SelectStyle } from './select_style';
import { SelectedNodeEditor } from './selected_node_editor';
import { MergeCandidates } from './merge_candidates';
import { DrillDowns } from './drill_downs';
import { DrillDownIconLinks } from './drill_down_icon_links';
import { GraphState, liveResponseFieldsSelector, templatesSelector } from '../../state_management';
import { SelectedNodeItem } from './selected_node_item';
import { gphSidebarHeaderStyles } from '../../styles';

export interface TargetOptions {
  toFields: WorkspaceField[];
}

interface ControlPanelProps {
  renderCounter: number;
  workspace: Workspace;
  control: ControlType;
  selectedNode?: WorkspaceNode;
  colors: string[];
  mergeCandidates: TermIntersect[];
  onSetControl: (control: ControlType) => void;
  selectSelected: (node: WorkspaceNode) => void;
}

interface ControlPanelStateProps {
  urlTemplates: UrlTemplate[];
  liveResponseFields: WorkspaceField[];
}

const ControlPanelComponent = ({
  workspace,
  liveResponseFields,
  urlTemplates,
  control,
  selectedNode,
  colors,
  mergeCandidates,
  onSetControl,
  selectSelected,
}: ControlPanelProps & ControlPanelStateProps) => {
  const hasNodes = workspace.nodes.length === 0;

  const openUrlTemplate = (template: UrlTemplate) => {
    const url = template.url;
    const newUrl = url.replace(urlTemplateRegex, template.encoder.encode(workspace!));
    window.open(newUrl, '_blank');
  };

  const onSelectedFieldClick = (node: WorkspaceNode) => {
    selectSelected(node);
    workspace.changeHandler();
  };

  const onDeselectNode = (node: WorkspaceNode) => {
    workspace.deselectNode(node);
    workspace.changeHandler();
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
      <ControlPanelToolBar
        workspace={workspace}
        liveResponseFields={liveResponseFields}
        onSetControl={onSetControl}
      />

      <div>
        <div css={gphSidebarHeaderStyles}>
          {i18n.translate('xpack.graph.sidebar.selectionsTitle', {
            defaultMessage: 'Selections',
          })}
        </div>
        <SelectionToolBar workspace={workspace} onSetControl={onSetControl} />
        <div css={styles.gphSelectionList}>
          {workspace.selectedNodes.length === 0 && (
            <p className="help-block">
              {i18n.translate('xpack.graph.sidebar.selections.noSelectionsHelpText', {
                defaultMessage: 'No selections. Click on vertices to add.',
              })}
            </p>
          )}

          {workspace.selectedNodes.map((node) => (
            <SelectedNodeItem
              key={node.id}
              node={node}
              isHighlighted={selectedNode === node}
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
      {control === 'style' && workspace.selectedNodes.length > 0 && (
        <SelectStyle workspace={workspace} colors={colors} />
      )}
      {control === 'editLabel' && selectedNode && (
        <SelectedNodeEditor workspace={workspace} selectedNode={selectedNode} />
      )}
      {control === 'mergeTerms' && (
        <MergeCandidates
          workspace={workspace}
          mergeCandidates={mergeCandidates}
          onSetControl={onSetControl}
        />
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
