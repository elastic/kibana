/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type {
  InlineEditLensEmbeddableContext,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';

export const editButtonLabel = i18n.translate(
  'xpack.agentBuilder.conversation.visualization.edit',
  {
    defaultMessage: 'Edit visualization',
  }
);

export const saveButtonLabel = i18n.translate(
  'xpack.agentBuilder.conversation.visualization.saveToDashboard',
  {
    defaultMessage: 'Save to dashboard',
  }
);

export const dashboardWriteControlsDisabledReason = i18n.translate(
  'xpack.agentBuilder.conversation.visualization.dashboardWriteControlsDisabledReason',
  {
    defaultMessage:
      'You need dashboard write permissions to edit visualizations or save them to a dashboard.',
  }
);

interface Props {
  uiActions: UiActionsStart;
  lensInput: TypedLensByValueInput | undefined;
  lensLoadEvent: InlineEditLensEmbeddableContext['lensEvent'] | null;
  onAttributesChange: (a: TypedLensByValueInput['attributes']) => void;
  onApply: () => void;
  canWriteDashboards: boolean;
}

export function EditVisualizationButton({
  uiActions,
  lensInput,
  lensLoadEvent,
  onAttributesChange,
  onApply,
  canWriteDashboards,
}: Props) {
  const editModalOptions: InlineEditLensEmbeddableContext | undefined = useMemo(() => {
    if (!lensInput?.attributes) {
      return;
    }

    return {
      applyButtonLabel: saveButtonLabel,
      attributes: lensInput.attributes,
      lensEvent: lensLoadEvent ?? { adapters: {} },
      onUpdate: onAttributesChange,
      onApply,
      onCancel: () => {},
      container: null,
    };
  }, [lensInput, lensLoadEvent, onAttributesChange, onApply]);

  const button = (
    <EuiButtonIcon
      display="base"
      color="text"
      size="s"
      iconType="pencil"
      aria-label={editButtonLabel}
      isDisabled={!canWriteDashboards}
      onClick={() => {
        if (canWriteDashboards && editModalOptions) {
          uiActions.executeTriggerActions('IN_APP_EMBEDDABLE_EDIT_TRIGGER', editModalOptions);
        }
      }}
    />
  );

  return (
    <EuiToolTip
      content={canWriteDashboards ? editButtonLabel : dashboardWriteControlsDisabledReason}
      disableScreenReaderOutput
    >
      {canWriteDashboards ? button : <span tabIndex={0}>{button}</span>}
    </EuiToolTip>
  );
}
