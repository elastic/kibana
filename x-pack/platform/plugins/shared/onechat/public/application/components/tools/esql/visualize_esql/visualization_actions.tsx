/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import type {
  InlineEditLensEmbeddableContext,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { css } from '@emotion/react';
import { EditVisualizationButton, saveButtonLabel } from './edit_visualization_button';
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

  if (!lensInput) {
    return null;
  }

  return (
    <div
      className="visualization-button-actions"
      css={actionsContainer(euiTheme)}
      data-test-subj="visualizationButtonActions"
    >
      <EditVisualizationButton
        uiActions={uiActions}
        lensInput={lensInput}
        lensLoadEvent={lensLoadEvent}
        onAttributesChange={(attrs) => setLensInput({ ...lensInput, attributes: attrs })}
        onApply={onSave}
      />
      <EuiButtonIcon
        display="base"
        color="text"
        size="s"
        iconType="save"
        aria-label={saveButtonLabel}
        css={css({ marginLeft: '-1px' })} // avoid double border
        onClick={onSave}
      />
    </div>
  );
}
