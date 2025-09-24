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

interface Props {
  uiActions: UiActionsStart;
  lensInput: TypedLensByValueInput | undefined;
  lensLoadEvent: InlineEditLensEmbeddableContext['lensEvent'] | null;
  onAttributesChange: (a: TypedLensByValueInput['attributes']) => void;
  onApply: () => void;
  label: string;
}

export function EditVisualizationButton({
  uiActions,
  lensInput,
  lensLoadEvent,
  onAttributesChange,
  onApply,
  label,
}: Props) {
  const triggerOptions: InlineEditLensEmbeddableContext | undefined = useMemo(() => {
    if (!lensInput?.attributes) {
      return;
    }

    return {
      applyButtonLabel: label,
      attributes: lensInput.attributes,
      lensEvent: lensLoadEvent ?? { adapters: {} },
      onUpdate: onAttributesChange,
      onApply,
      onCancel: () => {},
      container: null,
    };
  }, [lensInput, lensLoadEvent, onAttributesChange, onApply, label]);

  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiButtonIcon
        display="base"
        color="text"
        size="s"
        iconType="pencil"
        aria-label={label}
        onClick={() => {
          if (triggerOptions) {
            uiActions.getTrigger('IN_APP_EMBEDDABLE_EDIT_TRIGGER').exec(triggerOptions);
          }
        }}
      />
    </EuiToolTip>
  );
}
