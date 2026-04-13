/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { MAX_TAG_LENGTH, MAX_TAGS_PER_EPISODE } from '@kbn/alerting-v2-constants';
import { useFetchAlertEpisodeTagSuggestions } from '../../hooks/use_fetch_alert_episode_tag_suggestions';
import * as i18n from './translations';

interface BulkTagsModalProps {
  onClose: () => void;
  onSave: (tags: string[]) => void;
  services: { expressions: ExpressionsStart };
}

export const BulkTagsModal = ({ onClose, onSave, services }: BulkTagsModalProps) => {
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    []
  );

  const { data: suggestionTags = [] } = useFetchAlertEpisodeTagSuggestions({ services });

  const options: Array<EuiComboBoxOptionOption<string>> = suggestionTags.map((tag) => ({
    label: tag,
  }));

  const handleChange = useCallback((nextOptions: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedOptions(nextOptions);
  }, []);

  const handleCreateOption = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || trimmed.length > MAX_TAG_LENGTH) return;
      if (selectedOptions.length >= MAX_TAGS_PER_EPISODE) return;
      setSelectedOptions((prev) => [...prev, { label: trimmed }]);
    },
    [selectedOptions.length]
  );

  const handleSave = useCallback(() => {
    onSave(selectedOptions.map((o) => o.label));
    onClose();
  }, [onSave, onClose, selectedOptions]);

  return (
    <EuiModal onClose={onClose} aria-labelledby="bulkTagsModalTitle" data-test-subj="bulkTagsModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle id="bulkTagsModalTitle">
          {i18n.BULK_TAGS_MODAL_TITLE}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>{i18n.BULK_TAGS_MODAL_REPLACE_WARNING}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiComboBox
          placeholder={i18n.BULK_TAGS_MODAL_COMBOBOX_PLACEHOLDER}
          options={options}
          selectedOptions={selectedOptions}
          onChange={handleChange}
          onCreateOption={handleCreateOption}
          isClearable
          data-test-subj="bulkTagsModalComboBox"
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="bulkTagsModalCancel">
              {i18n.BULK_TAGS_MODAL_CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={handleSave} data-test-subj="bulkTagsModalSave">
              {i18n.BULK_TAGS_MODAL_SAVE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
