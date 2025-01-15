/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Workspace, WorkspaceNode } from '../../types';
import { IconRenderer } from '../icon_renderer';

interface SelectedNodeEditorProps {
  workspace: Workspace;
  selectedNode: WorkspaceNode;
}

export const SelectedNodeEditor = ({ workspace, selectedNode }: SelectedNodeEditorProps) => {
  const { euiTheme } = useEuiTheme();
  const groupButtonMsg = i18n.translate('xpack.graph.sidebar.groupButtonTooltip', {
    defaultMessage: 'group the currently selected items into {latestSelectionLabel}',
    values: { latestSelectionLabel: selectedNode.label },
  });
  const ungroupButtonMsg = i18n.translate('xpack.graph.sidebar.ungroupButtonTooltip', {
    defaultMessage: 'ungroup {latestSelectionLabel}',
    values: { latestSelectionLabel: selectedNode.label },
  });

  const onGroupButtonClick = () => {
    workspace.groupSelections(selectedNode);
  };
  const onClickUngroup = () => {
    workspace.ungroup(selectedNode);
  };
  const onChangeSelectedVertexLabel = (event: React.ChangeEvent<HTMLInputElement>) => {
    selectedNode.label = event.target.value;
    workspace.changeHandler();
  };

  return (
    <div className="gphSidebar__panel">
      <div className="gphSidebar__header">
        <IconRenderer icon={selectedNode.icon} color={euiTheme.colors.darkShade} />{' '}
        {selectedNode.data.field} {selectedNode.data.term}
      </div>

      {(workspace.selectedNodes.length > 1 ||
        (workspace.selectedNodes.length > 0 && workspace.selectedNodes[0] !== selectedNode)) && (
        <EuiToolTip content={groupButtonMsg}>
          <EuiButtonEmpty iconType="fold" onClick={onGroupButtonClick}>
            <FormattedMessage id="xpack.graph.sidebar.groupButtonLabel" defaultMessage="group" />
          </EuiButtonEmpty>
        </EuiToolTip>
      )}

      {selectedNode.numChildren > 0 && (
        <EuiToolTip content={ungroupButtonMsg}>
          <EuiButtonEmpty iconType="unfold" onClick={onClickUngroup}>
            <FormattedMessage
              id="xpack.graph.sidebar.ungroupButtonLabel"
              defaultMessage="ungroup"
            />
          </EuiButtonEmpty>
        </EuiToolTip>
      )}

      <form className="form-horizontal">
        <div className="form-group form-group-sm gphFormGroup--small">
          <label htmlFor="labelEdit" className="col-sm-3 control-label">
            {i18n.translate('xpack.graph.sidebar.displayLabelLabel', {
              defaultMessage: 'Display label',
            })}
          </label>
          <div className="col-sm-9">
            <input
              ref={(element) => element && (element.value = selectedNode.label)}
              type="text"
              id="labelEdit"
              className="form-control input-sm"
              onChange={onChangeSelectedVertexLabel}
            />
            <div className="help-block">
              {i18n.translate('xpack.graph.sidebar.displayLabelHelpText', {
                defaultMessage: 'Change the label for this vertex.',
              })}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
