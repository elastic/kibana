/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { ControlType, Workspace } from '../../types';

interface SelectionToolBarProps {
  workspace: Workspace;
  onSetControl: (data: ControlType) => void;
}

export const SelectionToolBar = ({ workspace, onSetControl }: SelectionToolBarProps) => {
  const haveNodes = workspace.nodes.length === 0;

  const selectAllButtonMsg = i18n.translate(
    'xpack.graph.sidebar.selections.selectAllButtonTooltip',
    {
      defaultMessage: 'Select all',
    }
  );
  const selectNoneButtonMsg = i18n.translate(
    'xpack.graph.sidebar.selections.selectNoneButtonTooltip',
    {
      defaultMessage: 'Select none',
    }
  );
  const invertSelectionButtonMsg = i18n.translate(
    'xpack.graph.sidebar.selections.invertSelectionButtonTooltip',
    {
      defaultMessage: 'Invert selection',
    }
  );
  const selectNeighboursButtonMsg = i18n.translate(
    'xpack.graph.sidebar.selections.selectNeighboursButtonTooltip',
    {
      defaultMessage: 'Select neighbours',
    }
  );

  const onSelectAllClick = () => {
    onSetControl('none');
    workspace.selectAll();
    workspace.changeHandler();
  };
  const onSelectNoneClick = () => {
    onSetControl('none');
    workspace.selectNone();
    workspace.changeHandler();
  };
  const onInvertSelectionClick = () => {
    onSetControl('none');
    workspace.selectInvert();
    workspace.changeHandler();
  };
  const onSelectNeighboursClick = () => {
    onSetControl('none');
    workspace.selectNeighbours();
    workspace.changeHandler();
  };

  return (
    <EuiFlexGroup
      className="vertexSelectionTypesBar"
      justifyContent="flexStart"
      gutterSize="s"
      alignItems="center"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiToolTip content={selectAllButtonMsg}>
          <EuiButtonEmpty
            data-test-subj="graphSelectAll"
            size="s"
            isDisabled={haveNodes}
            color="text"
            onClick={onSelectAllClick}
          >
            {i18n.translate('xpack.graph.sidebar.selections.selectAllButtonLabel', {
              defaultMessage: 'all',
            })}
          </EuiButtonEmpty>
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={selectNoneButtonMsg}>
          <EuiButtonEmpty
            data-test-subj="graphSelectNone"
            size="s"
            isDisabled={haveNodes}
            color="text"
            onClick={onSelectNoneClick}
          >
            {i18n.translate('xpack.graph.sidebar.selections.selectNoneButtonLabel', {
              defaultMessage: 'none',
            })}
          </EuiButtonEmpty>
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={invertSelectionButtonMsg}>
          <EuiButtonEmpty
            data-test-subj="graphInvertSelection"
            size="s"
            isDisabled={haveNodes}
            color="text"
            onClick={onInvertSelectionClick}
          >
            {i18n.translate('xpack.graph.sidebar.selections.invertSelectionButtonLabel', {
              defaultMessage: 'invert',
            })}
          </EuiButtonEmpty>
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={selectNeighboursButtonMsg}>
          <EuiButtonEmpty
            data-test-subj="graphLinkedSelection"
            size="s"
            isDisabled={workspace.selectedNodes.length === 0}
            color="text"
            onClick={onSelectNeighboursClick}
          >
            {i18n.translate('xpack.graph.sidebar.selections.selectNeighboursButtonLabel', {
              defaultMessage: 'linked',
            })}
          </EuiButtonEmpty>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
