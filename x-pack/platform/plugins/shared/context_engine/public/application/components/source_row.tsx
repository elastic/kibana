/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAvatar,
  EuiButtonIcon,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { AiIndexSource } from '../../../common/http_api/ai_indices';
import { toSourceType } from '../utils/sources';
// Imported from the modules rather than the barrel: the source picker renders
// this row, so importing its barrel here would create a cycle.
import { SourceTypeBadge } from './source_picker/source_type_badge';
import { getSourceTypeLabel } from './source_picker/types';

interface SourceRowProps {
  source: AiIndexSource;
  /** Resolved connector name, when the source is a connector. */
  connectorName?: string;
  /** Renders a remove button when the row belongs to an editable list. */
  onRemove?: () => void;
  'data-test-subj'?: string;
}

/**
 * A single source, rendered the same way in the read-only detail list and in
 * the source picker's list of selected sources.
 */
export const SourceRow = ({
  source,
  connectorName,
  onRemove,
  'data-test-subj': dataTestSubj,
}: SourceRowProps) => {
  const isConnector = source.type === 'connector';
  const sourceType = toSourceType(source.type);
  const label = isConnector ? connectorName ?? source.value : source.value;
  const removeLabel = i18n.translate('xpack.contextEngine.sourceRow.removeAriaLabel', {
    defaultMessage: 'Remove {label}',
    values: { label },
  });

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={dataTestSubj}>
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiAvatar
            type="space"
            size="m"
            color="subdued"
            name={getSourceTypeLabel(sourceType)}
            iconType={isConnector ? 'plugs' : 'editorCodeBlock'}
            iconColor="primary"
            iconSize="m"
          />
        </EuiFlexItem>
        {/* minWidth: 0 lets the flex item shrink so long queries truncate instead of overflowing the panel */}
        <EuiFlexItem css={{ minWidth: 0 }}>
          <EuiText size="s" className="eui-textTruncate">
            <strong>
              {isConnector ? (
                label
              ) : (
                <EuiCode language="sql" transparentBackground>
                  {source.value}
                </EuiCode>
              )}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SourceTypeBadge type={sourceType} data-test-subj="contextSourceTypeBadge" />
        </EuiFlexItem>
        {onRemove && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={removeLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                color="text"
                onClick={onRemove}
                aria-label={removeLabel}
                data-test-subj="contextRemoveSourceButton"
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
