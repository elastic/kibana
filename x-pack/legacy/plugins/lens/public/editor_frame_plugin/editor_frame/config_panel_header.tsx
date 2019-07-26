/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiIcon,
  EuiPopover,
  EuiButton,
  EuiPopoverTitle,
  EuiKeyPadMenu,
  EuiKeyPadMenuItemButton,
} from '@elastic/eui';
import { flatten } from 'lodash';
import { i18n } from '@kbn/i18n';
import { NativeRenderer } from '../../native_renderer';
import { Visualization } from '../../types';

interface Props {
  visualizations: Visualization[];
  visualizationId: string | null;
  visualizationState: unknown;
  onChange: (visualizationId: string, subVisualizationId: string) => void;
}

function VisualizationSummary(props: Props) {
  const visualization = props.visualizations.find(v => v.id === props.visualizationId);

  if (!visualization) {
    return (
      <>
        {i18n.translate('xpack.lens.configPanel.chooseVisualization', {
          defaultMessage: 'Choose a visualization',
        })}
      </>
    );
  }

  return (
    <NativeRenderer
      render={visualization.renderDescription}
      nativeProps={props.visualizationState}
    />
  );
}

export function ConfigPanelHeader(props: Props) {
  const [state, setState] = useState({
    isFlyoutOpen: false,
  });
  const close = () => setState({ isFlyoutOpen: false });
  const visualizationTypes = flatten(
    props.visualizations.map(v =>
      v.visualizationTypes.map(t => ({
        visualizationId: v.id,
        ...t,
      }))
    )
  );

  return (
    <EuiPopover
      id="lnsConfigPanelHeaderPopover"
      ownFocus
      button={
        <EuiButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setState({ isFlyoutOpen: !state.isFlyoutOpen })}
          data-test-subj="lnsConfigPanelHeaderPopover"
        >
          <VisualizationSummary {...props} />
        </EuiButton>
      }
      isOpen={state.isFlyoutOpen}
      closePopover={close}
      anchorPosition="leftUp"
    >
      <EuiPopoverTitle>
        {i18n.translate('xpack.lens.configPanel.chooseVisualization', {
          defaultMessage: 'Choose a visualization',
        })}
      </EuiPopoverTitle>
      <EuiKeyPadMenu>
        {visualizationTypes.map(v => (
          <EuiKeyPadMenuItemButton
            key={`${v.visualizationId}:${v.id}`}
            label={<span data-test-subj="visTypeTitle">{v.label}</span>}
            role="menuitem"
            data-test-subj={`lnsConfigPanelHeaderPopover_${v.id}`}
            onClick={() => {
              props.onChange(v.visualizationId, v.id);
              close();
            }}
          >
            <EuiIcon type={v.icon || 'empty'} />
          </EuiKeyPadMenuItemButton>
        ))}
      </EuiKeyPadMenu>
    </EuiPopover>
  );
}
