/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  InlineEditLensEmbeddableContext,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  dashboardWriteControlsDisabledReason,
  EditVisualizationButton,
  saveButtonLabel,
} from './edit_visualization_button';
import { actionsContainer } from './styles';

interface Props {
  onSave: () => void;
  uiActions: UiActionsStart;
  lensInput: TypedLensByValueInput | undefined;
  lensLoadEvent: InlineEditLensEmbeddableContext['lensEvent'] | null;
  setLensInput: (input: TypedLensByValueInput) => void;
}

export function VisualizationActions({
  onSave,
  uiActions,
  lensInput,
  lensLoadEvent,
  setLensInput,
}: Props) {
  const { euiTheme } = useEuiTheme();
  const {
    services: { application },
  } = useKibana();

  if (!lensInput) {
    return null;
  }

  const canWriteDashboards = application?.capabilities.dashboard_v2?.showWriteControls === true;
  const containerCss = css(actionsContainer(euiTheme));
  const iconCss = css({ marginLeft: '-1px' });
  const saveButton = (
    <EuiButtonIcon
      display="base"
      color="text"
      size="s"
      iconType="save"
      aria-label={saveButtonLabel}
      className={iconCss}
      isDisabled={!canWriteDashboards}
      onClick={() => {
        if (canWriteDashboards) {
          onSave();
        }
      }}
    />
  );

  return (
    <div
      className={`visualization-button-actions ${containerCss}`}
      data-test-subj="visualizationButtonActions"
    >
      <EditVisualizationButton
        uiActions={uiActions}
        lensInput={lensInput}
        lensLoadEvent={lensLoadEvent}
        onAttributesChange={(attrs) => setLensInput({ ...lensInput, attributes: attrs })}
        onApply={onSave}
        canWriteDashboards={canWriteDashboards}
      />
      <EuiToolTip
        content={canWriteDashboards ? saveButtonLabel : dashboardWriteControlsDisabledReason}
        disableScreenReaderOutput
      >
        {canWriteDashboards ? saveButton : <span tabIndex={0}>{saveButton}</span>}
      </EuiToolTip>
    </div>
  );
}
