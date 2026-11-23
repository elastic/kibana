/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import * as i18n from './translations';

interface RemoveSelectedAttachmentsProps {
  count: number;
  onRemove: () => void;
  isRemoving?: boolean;
}

/** Selected count and remove button for an attachment table. Renders nothing with no selection. */
export const RemoveSelectedAttachments: React.FC<RemoveSelectedAttachmentsProps> = ({
  count,
  onRemove,
  isRemoving = false,
}) => {
  if (count === 0) {
    return null;
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" data-test-subj="cases-attachments-selected-count">
          {i18n.SELECTED_ATTACHMENTS(count)}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          color="danger"
          iconType="trash"
          flush="left"
          onClick={onRemove}
          isLoading={isRemoving}
          isDisabled={isRemoving}
          data-test-subj="cases-attachments-remove-selected"
        >
          {i18n.REMOVE}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

RemoveSelectedAttachments.displayName = 'RemoveSelectedAttachments';
