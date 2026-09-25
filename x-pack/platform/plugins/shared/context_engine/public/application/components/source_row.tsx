/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { ReactNode } from 'react';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../common/telemetry';
import { ItemRow } from './item_row';
import type { SourceType } from './source_picker/types';

interface SourceRowProps {
  label: string;
  typeLabel: string;
  icon: ReactNode;
  children?: ReactNode;
  onRemove?: () => void;
  sourceType?: SourceType;
  'data-test-subj'?: string;
}

export const SourceRow = ({
  label,
  typeLabel,
  icon,
  children,
  onRemove,
  sourceType,
  'data-test-subj': dataTestSubj,
}: SourceRowProps) => {
  const removeLabel = i18n.translate('xpack.contextEngine.sourceRow.removeAriaLabel', {
    defaultMessage: 'Remove {label}',
    values: { label },
  });

  return (
    <ItemRow
      label={label}
      icon={icon}
      badge={
        <EuiBadge color="hollow" data-test-subj="contextSourceTypeBadge">
          {typeLabel}
        </EuiBadge>
      }
      actions={
        onRemove ? (
          <EuiToolTip content={removeLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="cross"
              color="text"
              onClick={onRemove}
              aria-label={removeLabel}
              data-test-subj="contextRemoveSourceButton"
              {...getEbtProps({
                element: CONTEXT_ENGINE_UI_EBT.element.aiIndexEditFlyoutSourcePicker,
                action: CONTEXT_ENGINE_UI_EBT.action.sources.REMOVE_SOURCE,
                ...(sourceType !== undefined && { detail: sourceType }),
              })}
            />
          </EuiToolTip>
        ) : undefined
      }
      data-test-subj={dataTestSubj}
    >
      <strong>{children ?? label}</strong>
    </ItemRow>
  );
};
