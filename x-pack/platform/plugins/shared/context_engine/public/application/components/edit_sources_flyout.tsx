/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { useSaveAiIndexSources } from '../hooks/use_save_ai_index_sources';
import { toSelectedSources } from '../utils/sources';
import { SourcePicker } from './source_picker';
import type { SelectedSource } from './source_picker';

interface EditSourcesFlyoutProps {
  aiIndex: GetAiIndexResponse;
  onClose: () => void;
  onSaved: () => void;
}

export const EditSourcesFlyout = ({ aiIndex, onClose, onSaved }: EditSourcesFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId();
  const { saveSources, isSaving } = useSaveAiIndexSources();
  const [selectedSources, setSelectedSources] = useState<SelectedSource[]>(() =>
    toSelectedSources(aiIndex.sources)
  );

  const handleDone = async () => {
    const saved = await saveSources(aiIndex, selectedSources);
    if (saved) {
      onSaved();
    }
  };

  const flyoutTitle = i18n.translate('xpack.contextEngine.editSources.title', {
    defaultMessage: 'Edit sources for "{name}"',
    values: { name: aiIndex.id },
  });

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      size="s"
      session="start"
      data-test-subj="contextEditSourcesFlyout"
      flyoutMenuProps={{
        title: flyoutTitle,
        titleId: flyoutTitleId,
      }}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{flyoutTitle}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.contextEngine.editSources.description"
              defaultMessage="Pick what this AI index should build context from. You can add more than one."
            />
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SourcePicker selectedSources={selectedSources} onChange={setSelectedSources} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={onClose}
              flush="left"
              data-test-subj="contextEditSourcesCancelButton"
            >
              <FormattedMessage
                id="xpack.contextEngine.editSources.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleDone}
              isLoading={isSaving}
              data-test-subj="contextEditSourcesDoneButton"
            >
              <FormattedMessage
                id="xpack.contextEngine.editSources.doneButton"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
