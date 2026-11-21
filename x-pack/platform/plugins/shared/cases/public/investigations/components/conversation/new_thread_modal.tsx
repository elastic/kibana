/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { InvestigationRecord, ThreadRef } from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { useCreateThread, useInvestigationToasts } from '../../hooks';
import type { ConversationMessage } from './messages';
import * as i18n from './translations';

export interface NewThreadModalProps {
  record: InvestigationRecord;
  /** Messages of the main conversation the thread can be anchored to. */
  messages: ConversationMessage[];
  onCreated: (thread: ThreadRef) => void;
  onClose: () => void;
}

const NO_ANCHOR = '';

/** Starts a thread (a separate linked conversation) with a title and an optional message anchor. */
export const NewThreadModal: React.FC<NewThreadModalProps> = ({
  record,
  messages,
  onCreated,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId();
  const { showSuccess } = useInvestigationToasts();
  const { mutateAsync, isLoading } = useCreateThread(record.id);
  const [title, setTitle] = useState('');
  const [anchor, setAnchor] = useState(NO_ANCHOR);
  const [error, setError] = useState<string | null>(null);

  const anchorOptions = useMemo(
    () => [
      { value: NO_ANCHOR, text: i18n.NEW_THREAD_ANCHOR_NONE },
      ...messages.map(({ index, authorName }) => ({
        value: i18n.MESSAGE_LABEL(index),
        text: `${i18n.MESSAGE_LABEL(index)} · ${authorName}`,
      })),
    ],
    [messages]
  );

  const submit = async () => {
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      setError(i18n.NEW_THREAD_TITLE_REQUIRED);
      return;
    }
    try {
      const { thread } = await mutateAsync({
        title: trimmed,
        anchor: anchor === NO_ANCHOR ? null : anchor,
      });
      showSuccess(i18n.NEW_THREAD_SUCCESS(thread.title));
      onCreated(thread);
    } catch {
      // The mutation hook already reported the error.
    }
  };

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="investigationNewThreadModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.NEW_THREAD_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <form
          id="investigationNewThreadForm"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <EuiFormRow
            label={i18n.NEW_THREAD_FIELD_TITLE}
            isInvalid={error !== null}
            error={error}
            fullWidth
          >
            <EuiFieldText
              autoFocus
              fullWidth
              value={title}
              maxLength={INVESTIGATION_LIMITS.maxTitleLength}
              placeholder={i18n.NEW_THREAD_TITLE_PLACEHOLDER}
              isInvalid={error !== null}
              onChange={(event) => {
                setTitle(event.target.value);
                setError(null);
              }}
              data-test-subj="investigationNewThreadTitle"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.NEW_THREAD_FIELD_ANCHOR}
            helpText={i18n.NEW_THREAD_ANCHOR_HELP}
            fullWidth
          >
            <EuiSelect
              fullWidth
              options={anchorOptions}
              value={anchor}
              onChange={(event) => setAnchor(event.target.value)}
              data-test-subj="investigationNewThreadAnchor"
            />
          </EuiFormRow>
        </form>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="investigationNewThreadCancel">
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          type="submit"
          form="investigationNewThreadForm"
          fill
          isLoading={isLoading}
          data-test-subj="investigationNewThreadSubmit"
        >
          {i18n.NEW_THREAD_CREATE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
NewThreadModal.displayName = 'NewThreadModal';
