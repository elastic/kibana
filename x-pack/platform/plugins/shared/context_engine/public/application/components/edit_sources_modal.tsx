/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { useEsqlViews } from '../hooks/use_esql_views';
import { useSaveAiIndexSources } from '../hooks/use_save_ai_index_sources';
import { toSelectedSources } from '../utils/sources';
import { SourcePicker } from './source_picker';
import type { SelectedSource } from './source_picker';

interface EditSourcesModalProps {
  aiIndex: GetAiIndexResponse;
  onClose: () => void;
  onSaved: () => void;
}

export const EditSourcesModal = ({ aiIndex, onClose, onSaved }: EditSourcesModalProps) => {
  const modalTitleId = useGeneratedHtmlId();
  const { views, isLoading: isLoadingViews } = useEsqlViews();
  const { saveSources, isSaving } = useSaveAiIndexSources();
  // `undefined` until the ES|QL views load so stored sources can be matched back
  // to their views (for correct labels and selected state) before rendering.
  const [selectedSources, setSelectedSources] = useState<SelectedSource[] | undefined>(undefined);

  useEffect(() => {
    if (selectedSources !== undefined || isLoadingViews) {
      return;
    }
    setSelectedSources(toSelectedSources(aiIndex.sources, views));
  }, [aiIndex.sources, views, isLoadingViews, selectedSources]);

  const handleDone = async () => {
    const saved = await saveSources(aiIndex, selectedSources ?? []);
    if (saved) {
      onSaved();
    }
  };

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={modalTitleId}
      maxWidth={720}
      data-test-subj="contextEditSourcesModal"
    >
      <EuiModalHeader>
        <div>
          <EuiModalHeaderTitle id={modalTitleId}>
            {i18n.translate('xpack.contextEngine.editSources.title', {
              defaultMessage: 'Edit sources for "{name}"',
              values: { name: aiIndex.name },
            })}
          </EuiModalHeaderTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.contextEngine.editSources.description', {
                defaultMessage:
                  'Pick what this AI index should build context from. You can add more than one.',
              })}
            </p>
          </EuiText>
        </div>
      </EuiModalHeader>
      <EuiModalBody>
        {selectedSources === undefined ? (
          <EuiSkeletonText lines={4} data-test-subj="contextEditSourcesLoading" />
        ) : (
          <SourcePicker selectedSources={selectedSources} onChange={setSelectedSources} />
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="contextEditSourcesCancelButton">
          {i18n.translate('xpack.contextEngine.editSources.cancelButton', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={handleDone}
          isLoading={isSaving}
          isDisabled={selectedSources === undefined}
          data-test-subj="contextEditSourcesDoneButton"
        >
          {i18n.translate('xpack.contextEngine.editSources.doneButton', {
            defaultMessage: 'Done',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
