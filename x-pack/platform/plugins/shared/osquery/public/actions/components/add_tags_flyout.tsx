/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiComboBox,
  EuiText,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isEqual } from 'lodash';
import { MAX_TAGS_PER_ACTION, MAX_TAG_LENGTH } from '../../../common/constants';
import { useHistoryTags } from '../use_history_tags';
import { useUpdateActionTags } from '../use_update_action_tags';

const FLYOUT_TITLE = i18n.translate('xpack.osquery.addTagsFlyout.title', {
  defaultMessage: 'Add tags',
});

const FORM_LABEL = i18n.translate('xpack.osquery.addTagsFlyout.formLabel', {
  defaultMessage: 'Add tags for selected result',
});

const HELPER_TEXT = i18n.translate('xpack.osquery.addTagsFlyout.helperText', {
  defaultMessage:
    'Add one or more tags for selected result from the dropdown. You can also enter custom identifying tags and press Enter to begin a new one.',
});

const CUSTOM_OPTION_TEXT = i18n.translate('xpack.osquery.addTagsFlyout.customOptionText', {
  defaultMessage: 'Add {searchValue} as a tag',
  values: { searchValue: '{searchValue}' },
});

const TAGS_PLACEHOLDER = i18n.translate('xpack.osquery.addTagsFlyout.placeholder', {
  defaultMessage: 'Add tags...',
});

const MAX_TAGS_ERROR = i18n.translate('xpack.osquery.addTagsFlyout.maxTagsError', {
  defaultMessage: 'Maximum of {max} tags allowed',
  values: { max: MAX_TAGS_PER_ACTION },
});

interface AddTagsFlyoutProps {
  actionId: string;
  currentTags: string[];
  onClose: () => void;
  onSave?: () => void;
}

const AddTagsFlyoutComponent: React.FC<AddTagsFlyoutProps> = ({
  actionId,
  currentTags,
  onClose,
  onSave,
}) => {
  const [localTags, setLocalTags] = useState<string[]>(currentTags);
  const { tags: availableTags } = useHistoryTags();
  const { mutate: updateTags, isLoading: isSaving } = useUpdateActionTags();

  const isAtMaxTags = localTags.length >= MAX_TAGS_PER_ACTION;

  const selectedOptions: EuiComboBoxOptionOption[] = useMemo(
    () => localTags.map((tag) => ({ label: tag, key: tag })),
    [localTags]
  );

  const options: EuiComboBoxOptionOption[] = useMemo(() => {
    const tagSet = new Set(localTags);

    return availableTags.filter((tag) => !tagSet.has(tag)).map((tag) => ({ label: tag, key: tag }));
  }, [availableTags, localTags]);

  const hasChanges = useMemo(
    () => !isEqual([...currentTags].sort(), [...localTags].sort()),
    [currentTags, localTags]
  );

  const handleChange = useCallback((newOptions: EuiComboBoxOptionOption[]) => {
    setLocalTags(newOptions.map((opt) => opt.label));
  }, []);

  const handleCreateOption = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || trimmed.length > MAX_TAG_LENGTH || localTags.length >= MAX_TAGS_PER_ACTION) {
        return false;
      }

      if (localTags.includes(trimmed)) {
        return false;
      }

      setLocalTags((prev) => [...prev, trimmed]);

      return true;
    },
    [localTags]
  );

  const handleSave = useCallback(() => {
    updateTags(
      { actionId, tags: localTags },
      {
        onSuccess: () => {
          onSave?.();
          onClose();
        },
      }
    );
  }, [actionId, localTags, updateTags, onSave, onClose]);

  return (
    <EuiFlyout onClose={onClose} size="s" ownFocus>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{FLYOUT_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow
          label={FORM_LABEL}
          fullWidth
          isInvalid={isAtMaxTags}
          error={isAtMaxTags ? MAX_TAGS_ERROR : undefined}
        >
          <EuiComboBox
            placeholder={TAGS_PLACEHOLDER}
            options={options}
            selectedOptions={selectedOptions}
            onChange={handleChange}
            onCreateOption={handleCreateOption}
            customOptionText={CUSTOM_OPTION_TEXT}
            isClearable
            fullWidth
            data-test-subj="add-tags-flyout-combo-box"
          />
        </EuiFormRow>
        <EuiText size="xs" color="subdued">
          <p>{HELPER_TEXT}</p>
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="add-tags-flyout-cancel">
              <FormattedMessage
                id="xpack.osquery.addTagsFlyout.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleSave}
              fill
              disabled={!hasChanges}
              isLoading={isSaving}
              data-test-subj="add-tags-flyout-save"
            >
              <FormattedMessage id="xpack.osquery.addTagsFlyout.saveButton" defaultMessage="Save" />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

AddTagsFlyoutComponent.displayName = 'AddTagsFlyout';

export const AddTagsFlyout = React.memo(AddTagsFlyoutComponent);
