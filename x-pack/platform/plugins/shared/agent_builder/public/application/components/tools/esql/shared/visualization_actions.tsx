/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
<<<<<<< HEAD
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { ActionButtonType, type ActionButton } from '@kbn/agent-builder-browser/attachments';
import { actionsContainerStyles, visualizationActionsClassName } from './styles';

export const renderActionButton = (button: ActionButton) => {
  const buttonElement = (
    <EuiToolTip content={button.label} disableScreenReaderOutput>
      <EuiButtonIcon
        display="base"
        color="text"
        size="s"
        iconType={button.icon ? button.icon : 'pencil'}
        aria-label={button.label}
        css={button.type === ActionButtonType.PRIMARY ? css({ marginLeft: '-1px' }) : undefined}
        isDisabled={button.disabled}
        onClick={button.handler}
      />
    </EuiToolTip>
  );
  const tooltipContent = button.disabled ? button.disabledReason ?? button.label : button.label;

  return (
    <EuiToolTip key={button.label} content={tooltipContent} disableScreenReaderOutput>
      {button.disabled ? <span tabIndex={0}>{buttonElement}</span> : buttonElement}
    </EuiToolTip>
  );
};

export const FallbackVisualizationActions = ({ buttons }: { buttons: ActionButton[] }) => {
  return (
    <div
      css={actionsContainerStyles}
      className={visualizationActionsClassName}
      data-test-subj="visualizationButtonActions"
    >
      {buttons.map(renderActionButton)}
=======
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
>>>>>>> 9.4
    </div>
  );
};
