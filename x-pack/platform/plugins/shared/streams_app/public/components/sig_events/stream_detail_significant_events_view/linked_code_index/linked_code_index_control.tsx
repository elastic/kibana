/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiForm,
  EuiFormRow,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { STREAMS_SIGNIFICANT_EVENTS_SEMANTIC_CODE_SEARCH_GROUNDING_ENABLED_FLAG } from '@kbn/streams-plugin/common';
import React, { useCallback, useMemo, useState } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useFetchCodeIndices } from '../../../../hooks/sig_events/use_fetch_code_indices';
import { getFormattedError } from '../../../../util/errors';
import { readLinkedCodeIndex, writeLinkedCodeIndex } from './linked_code_index_storage';

interface Props {
  streamName: string;
}

export function LinkedCodeIndexControl({ streamName }: Props) {
  const {
    core: { featureFlags, settings, notifications },
  } = useKibana();

  const isEnabled = featureFlags.getBooleanValue(
    STREAMS_SIGNIFICANT_EVENTS_SEMANTIC_CODE_SEARCH_GROUNDING_ENABLED_FLAG,
    false
  );

  const [isOpen, setIsOpen] = useState(false);
  const [savedValue, setSavedValue] = useState('');
  const [draftValue, setDraftValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data, isFetching } = useFetchCodeIndices({ enabled: isEnabled && isOpen });

  const options = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    const indices = new Set(data?.indices ?? []);
    // Keep the currently-linked index selectable even if it is no longer
    // returned by the resolve call (e.g. deleted or on another cluster).
    if (draftValue) {
      indices.add(draftValue);
    }
    return [...indices].sort().map((index) => ({ label: index }));
  }, [data?.indices, draftValue]);

  const selectedOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () => (draftValue ? [{ label: draftValue }] : []),
    [draftValue]
  );

  const openPopover = useCallback(() => {
    const current = readLinkedCodeIndex(settings.globalClient, streamName);
    setSavedValue(current);
    setDraftValue(current);
    setIsOpen(true);
  }, [settings.globalClient, streamName]);

  const closePopover = useCallback(() => setIsOpen(false), []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await writeLinkedCodeIndex(settings.globalClient, streamName, draftValue);
      setSavedValue(draftValue.trim());
      notifications.toasts.addSuccess(SAVE_SUCCESS_TITLE);
      setIsOpen(false);
    } catch (err) {
      notifications.toasts.addDanger({
        title: SAVE_ERROR_TITLE,
        text: getFormattedError(err).message,
      });
    } finally {
      setIsSaving(false);
    }
  }, [draftValue, notifications.toasts, settings.globalClient, streamName]);

  if (!isEnabled) {
    return null;
  }

  const hasChanges = draftValue.trim() !== savedValue;

  return (
    <EuiPopover
      aria-label={POPOVER_TITLE}
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downRight"
      panelPaddingSize="m"
      button={
        <EuiButtonEmpty
          iconType="link"
          size="s"
          data-test-subj="streamsLinkedCodeIndexButton"
          onClick={isOpen ? closePopover : openPopover}
        >
          {BUTTON_LABEL}
        </EuiButtonEmpty>
      }
    >
      <div css={{ maxWidth: 360 }}>
        <EuiPopoverTitle>{POPOVER_TITLE}</EuiPopoverTitle>
        <EuiForm component="form">
          <EuiFormRow label={FIELD_LABEL} helpText={FIELD_HELP}>
            <EuiComboBox
              data-test-subj="streamsLinkedCodeIndexInput"
              singleSelection={{ asPlainText: true }}
              isClearable
              isLoading={isFetching}
              placeholder={FIELD_PLACEHOLDER}
              options={options}
              selectedOptions={selectedOptions}
              onChange={(selected) => setDraftValue(selected[0]?.label ?? '')}
              onCreateOption={(value) => setDraftValue(value.trim())}
            />
          </EuiFormRow>
        </EuiForm>
        <EuiPopoverFooter>
          <EuiButton
            fill
            fullWidth
            size="s"
            isLoading={isSaving}
            isDisabled={!hasChanges}
            data-test-subj="streamsLinkedCodeIndexSaveButton"
            onClick={handleSave}
          >
            {SAVE_LABEL}
          </EuiButton>
        </EuiPopoverFooter>
      </div>
    </EuiPopover>
  );
}

const BUTTON_LABEL = i18n.translate('xpack.streams.significantEvents.linkedCodeIndex.buttonLabel', {
  defaultMessage: 'Linked code',
});

const POPOVER_TITLE = i18n.translate(
  'xpack.streams.significantEvents.linkedCodeIndex.popoverTitle',
  { defaultMessage: 'Linked code index' }
);

const FIELD_LABEL = i18n.translate('xpack.streams.significantEvents.linkedCodeIndex.fieldLabel', {
  defaultMessage: 'Semantic Code Search index',
});

const FIELD_HELP = i18n.translate('xpack.streams.significantEvents.linkedCodeIndex.fieldHelp', {
  defaultMessage:
    'Index holding this stream’s source code (indexed via Semantic Code Search). When set, query generation can consult the code to verify queries. Clear the selection to unlink.',
});

const FIELD_PLACEHOLDER = i18n.translate(
  'xpack.streams.significantEvents.linkedCodeIndex.fieldPlaceholder',
  { defaultMessage: 'Select or type a code index' }
);

const SAVE_LABEL = i18n.translate('xpack.streams.significantEvents.linkedCodeIndex.saveLabel', {
  defaultMessage: 'Save',
});

const SAVE_SUCCESS_TITLE = i18n.translate(
  'xpack.streams.significantEvents.linkedCodeIndex.saveSuccess',
  { defaultMessage: 'Linked code index saved' }
);

const SAVE_ERROR_TITLE = i18n.translate(
  'xpack.streams.significantEvents.linkedCodeIndex.saveError',
  { defaultMessage: 'Failed to save linked code index' }
);
