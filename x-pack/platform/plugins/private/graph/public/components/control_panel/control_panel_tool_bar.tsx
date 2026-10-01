/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import type { ControlType, WorkspaceField } from '../../types';
import {
  blocklistSelectedNodes,
  deleteSelectedNodes,
  expandSelectedNodes,
  fillWorkspaceConnections,
  redoWorkspace,
  startWorkspaceLayout,
  stopWorkspaceLayout,
  type GraphDispatch,
  undoWorkspace,
  workspaceSelector,
} from '../../state_management';

interface ControlPanelToolBarProps {
  liveResponseFields: WorkspaceField[];
  onSetControl: (action: ControlType) => void;
}

export const ControlPanelToolBar = ({
  onSetControl,
  liveResponseFields,
}: ControlPanelToolBarProps) => {
  const dispatch = useDispatch<GraphDispatch>();
  const { isLayoutRunning, nodeIds, selectedNodeIds, undoHistory, redoHistory } =
    useSelector(workspaceSelector);
  const haveNodes = nodeIds.length === 0;

  const undoButtonMsg = i18n.translate('xpack.graph.sidebar.topMenu.undoButtonTooltip', {
    defaultMessage: 'Undo',
  });
  const redoButtonMsg = i18n.translate('xpack.graph.sidebar.topMenu.redoButtonTooltip', {
    defaultMessage: 'Redo',
  });
  const expandButtonMsg = i18n.translate(
    'xpack.graph.sidebar.topMenu.expandSelectionButtonTooltip',
    {
      defaultMessage: 'Expand selection',
    }
  );
  const addLinksButtonMsg = i18n.translate('xpack.graph.sidebar.topMenu.addLinksButtonTooltip', {
    defaultMessage: 'Add links between existing terms',
  });
  const removeVerticesButtonMsg = i18n.translate(
    'xpack.graph.sidebar.topMenu.removeVerticesButtonTooltip',
    {
      defaultMessage: 'Remove vertices from workspace',
    }
  );
  const blocklistButtonMsg = i18n.translate('xpack.graph.sidebar.topMenu.blocklistButtonTooltip', {
    defaultMessage: 'Block selection from appearing in workspace',
  });
  const customStyleButtonMsg = i18n.translate(
    'xpack.graph.sidebar.topMenu.customStyleButtonTooltip',
    {
      defaultMessage: 'Custom style selected vertices',
    }
  );
  const drillDownButtonMsg = i18n.translate('xpack.graph.sidebar.topMenu.drillDownButtonTooltip', {
    defaultMessage: 'Drill down',
  });
  const runLayoutButtonMsg = i18n.translate('xpack.graph.sidebar.topMenu.runLayoutButtonTooltip', {
    defaultMessage: 'Run layout',
  });
  const pauseLayoutButtonMsg = i18n.translate(
    'xpack.graph.sidebar.topMenu.pauseLayoutButtonTooltip',
    {
      defaultMessage: 'Pause layout',
    }
  );

  const onUndoClick = () => dispatch(undoWorkspace());
  const onRedoClick = () => dispatch(redoWorkspace());
  const onExpandButtonClick = () => {
    onSetControl('none');
    dispatch(expandSelectedNodes(liveResponseFields));
  };
  const onAddLinksClick = () => dispatch(fillWorkspaceConnections(undefined));
  const onRemoveVerticesClick = () => {
    onSetControl('none');
    dispatch(deleteSelectedNodes());
  };
  const onBlockListClick = () => dispatch(blocklistSelectedNodes());
  const onCustomStyleClick = () => onSetControl('style');
  const onDrillDownClick = () => onSetControl('drillDowns');
  const onRunLayoutClick = () => dispatch(startWorkspaceLayout());
  const onPauseLayoutClick = () => dispatch(stopWorkspaceLayout());

  return (
    <EuiFlexGroup gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={undoButtonMsg} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType={'undo'}
            size="xs"
            aria-label={undoButtonMsg}
            isDisabled={undoHistory.length < 1}
            onClick={onUndoClick}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={redoButtonMsg} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="redo"
            size="xs"
            aria-label={redoButtonMsg}
            isDisabled={redoHistory.length === 0}
            onClick={onRedoClick}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={expandButtonMsg} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="plus"
            size="xs"
            aria-label={expandButtonMsg}
            isDisabled={liveResponseFields.length === 0 || nodeIds.length === 0}
            onClick={onExpandButtonClick}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={addLinksButtonMsg} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="link"
            size="xs"
            aria-label={addLinksButtonMsg}
            isDisabled={haveNodes}
            onClick={onAddLinksClick}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={removeVerticesButtonMsg} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj="graphRemoveSelection"
            iconType="trash"
            size="xs"
            aria-label={removeVerticesButtonMsg}
            isDisabled={haveNodes}
            onClick={onRemoveVerticesClick}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={blocklistButtonMsg} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="eyeSlash"
            size="xs"
            aria-label={blocklistButtonMsg}
            isDisabled={selectedNodeIds.length === 0}
            onClick={onBlockListClick}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={customStyleButtonMsg} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="brush"
            size="xs"
            aria-label={customStyleButtonMsg}
            isDisabled={selectedNodeIds.length === 0}
            onClick={onCustomStyleClick}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiToolTip content={drillDownButtonMsg} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="info"
            size="xs"
            aria-label={drillDownButtonMsg}
            isDisabled={haveNodes}
            onClick={onDrillDownClick}
          />
        </EuiToolTip>
      </EuiFlexItem>

      {(nodeIds.length === 0 || !isLayoutRunning) && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={runLayoutButtonMsg} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="graphResumeLayout"
              iconType="play"
              size="xs"
              aria-label={runLayoutButtonMsg}
              isDisabled={nodeIds.length === 0}
              onClick={onRunLayoutClick}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}

      {isLayoutRunning && nodeIds.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={pauseLayoutButtonMsg} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="graphPauseLayout"
              iconType="pause"
              size="xs"
              aria-label={pauseLayoutButtonMsg}
              onClick={onPauseLayoutClick}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
