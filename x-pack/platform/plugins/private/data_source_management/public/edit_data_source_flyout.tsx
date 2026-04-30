/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';

import type { DataSourceListItem } from '../common/sample_data_sources_client';
import { createDataSourceFlyoutStrings } from './create_data_source_flyout_i18n';
import { dataSourcePreviewFlyoutStrings, dataSourcePreviewPageStrings } from './data_source_preview_flyout_i18n';

export interface EditDataSourceFlyoutProps {
  source: DataSourceListItem;
  onClose: () => void;
  onSave: (description: string) => Promise<void>;
}

export const EditDataSourceFlyout: FunctionComponent<EditDataSourceFlyoutProps> = ({
  source,
  onClose,
  onSave,
}) => {
  const titleId = 'editDataSourceFlyoutTitle';
  const [description, setDescription] = useState(source.description);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(description.trim());
    } finally {
      setIsSaving(false);
    }
  }, [description, onSave]);

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby={titleId}
      size="m"
      data-test-subj="editDataSourceFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{source.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow label={createDataSourceFlyoutStrings.descriptionLabel()} fullWidth>
          <EuiTextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            data-test-subj="editDataSourceFlyoutDescription"
            fullWidth
            rows={5}
            aria-label={createDataSourceFlyoutStrings.descriptionLabel()}
          />
        </EuiFormRow>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty flush="left" data-test-subj="editDataSourceFlyoutClose" onClick={onClose}>
              {dataSourcePreviewFlyoutStrings.closeButton()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              data-test-subj="editDataSourceFlyoutSave"
              onClick={() => void handleSave()}
              isLoading={isSaving}
              disabled={isSaving}
            >
              {dataSourcePreviewPageStrings.editSourceFlyoutSave()}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
