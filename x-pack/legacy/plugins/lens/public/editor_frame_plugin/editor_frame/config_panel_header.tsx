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
  EuiOverlayMask,
  EuiConfirmModal,
} from '@elastic/eui';
import { flatten } from 'lodash';
import { i18n } from '@kbn/i18n';
import { NativeRenderer } from '../../native_renderer';
import { Visualization } from '../../types';

interface VisualizationSelection {
  visualizationId: string;
  subVisualizationId: string;
}

interface State {
  isFlyoutOpen: boolean;
  confirmVisualization?: VisualizationSelection;
}

interface Props {
  visualizations: Visualization[];
  requireConfirmation: (visualizationId: string) => boolean;
  visualizationId: string | null;
  visualizationState: unknown;
  onChange: (selection: VisualizationSelection) => void;
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

function ConfirmationModal({
  onCancel,
  onConfirm,
  visualizationLabel,
}: {
  visualizationLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={i18n.translate('xpack.lens.configPanel.dropLayersTitle', {
          defaultMessage: 'Drop layers?',
        })}
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText={i18n.translate('xpack.lens.configPanel.dropLayersCancelLabel', {
          defaultMessage: `No, keep layers`,
        })}
        confirmButtonText={i18n.translate('xpack.lens.configPanel.dropLayersConfirmLabel', {
          defaultMessage: `Yes, drop layers`,
        })}
        defaultFocusedButton="cancel"
      >
        <p>
          {i18n.translate('xpack.lens.configPanel.dropLayersDescription', {
            defaultMessage: 'Switching to {visualizationLabel} will drop all but the first layers.',
            values: { visualizationLabel },
          })}
        </p>
        <p>
          {i18n.translate('xpack.lens.configPanel.dropLayersPrompt', {
            defaultMessage: 'Are you sure you want to drop layers?',
          })}
        </p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
}

function selectedVisualizationType(selection: VisualizationSelection, props: Props) {
  const visualization = props.visualizations.find(v => v.id === selection.visualizationId);
  return visualization!.visualizationTypes.find(v => v.id === selection.subVisualizationId)!;
}

export function ConfigPanelHeader(props: Props) {
  const [state, setState] = useState<State>({ isFlyoutOpen: false });

  const hideFlyout = (force: boolean = false) => {
    if (force || !state.confirmVisualization) {
      setState({ isFlyoutOpen: false });
    }
  };

  const requestConfirmation = (confirmVisualization: VisualizationSelection) => {
    setState({
      ...state,
      confirmVisualization,
    });
  };

  const commitSelection = (selection: VisualizationSelection) => {
    hideFlyout(true);
    props.onChange(selection);
  };

  const onSelect = (selection: VisualizationSelection) => {
    if (props.requireConfirmation(selection.visualizationId)) {
      requestConfirmation(selection);
    } else {
      commitSelection(selection);
    }
  };

  const visualizationTypes = flatten(
    props.visualizations.map(v =>
      v.visualizationTypes.map(t => ({
        visualizationId: v.id,
        ...t,
      }))
    )
  );

  return (
    <>
      {state.confirmVisualization && (
        <ConfirmationModal
          visualizationLabel={selectedVisualizationType(state.confirmVisualization, props).label}
          onCancel={() => setState({ ...state, confirmVisualization: undefined })}
          onConfirm={() => commitSelection(state.confirmVisualization!)}
        />
      )}
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
        closePopover={() => hideFlyout()}
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
              onClick={() =>
                onSelect({
                  visualizationId: v.visualizationId,
                  subVisualizationId: v.id,
                })
              }
            >
              <EuiIcon type={v.icon || 'empty'} />
            </EuiKeyPadMenuItemButton>
          ))}
        </EuiKeyPadMenu>
      </EuiPopover>
    </>
  );
}
