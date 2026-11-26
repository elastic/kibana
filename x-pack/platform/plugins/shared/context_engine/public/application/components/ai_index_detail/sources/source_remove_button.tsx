/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import type { SourceType } from './types';

interface SourceRemoveButtonProps {
  label: string;
  sourceType?: SourceType;
  onRemove: () => void;
  disabled?: boolean;
}

export const SourceRemoveButton = ({
  label,
  sourceType,
  onRemove,
  disabled = false,
}: SourceRemoveButtonProps) => {
  const removeLabel = i18n.translate('xpack.contextEngine.sourceRow.removeAriaLabel', {
    defaultMessage: 'Remove {label}',
    values: { label },
  });

  return (
    <EuiToolTip content={removeLabel} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="cross"
        color="text"
        onClick={onRemove}
        isDisabled={disabled}
        aria-label={removeLabel}
        data-test-subj="contextRemoveSourceButton"
        {...getEbtProps({
          element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageSourcesPanel,
          action: CONTEXT_ENGINE_UI_EBT.action.sources.REMOVE_SOURCE,
          ...(sourceType !== undefined && { detail: sourceType }),
        })}
      />
    </EuiToolTip>
  );
};
