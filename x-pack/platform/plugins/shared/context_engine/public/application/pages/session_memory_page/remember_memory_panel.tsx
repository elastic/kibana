/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiComboBox,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnSuccessCallout } from '@kbn/ui-callout';
import React, { useState } from 'react';
import { SESSION_MEMORY_TYPE_SUGGESTIONS } from '../../../../common/http_api/session_memory';
import type {
  RememberSessionMemoryBody,
  SessionMemoryMediaItem,
} from '../../../../common/http_api/session_memory';
import { useRememberSessionMemory } from '../../hooks/use_session_memory_mutations';
import { MEDIA_FILE_ACCEPT } from './media_file';
import { MediaFilePicker } from './media_file_picker';
import { PanelHeader } from './panel_header';
import { SessionMemoryCard } from './session_memory_card';
import { hasWriteIdentity, useSessionContext } from './session_context';
import type { SessionContextValue } from './session_context';

const labels = {
  type: i18n.translate('xpack.contextEngine.sessionMemory.remember.type', {
    defaultMessage: 'Type',
  }),
  typePlaceholder: i18n.translate('xpack.contextEngine.sessionMemory.remember.typePlaceholder', {
    defaultMessage: 'Select or type a category',
  }),
  content: i18n.translate('xpack.contextEngine.sessionMemory.remember.content', {
    defaultMessage: 'Content',
  }),
  contentHelp: i18n.translate('xpack.contextEngine.sessionMemory.remember.contentHelp', {
    defaultMessage: 'A memory needs content, a file, or both.',
  }),
  file: i18n.translate('xpack.contextEngine.sessionMemory.remember.file', {
    defaultMessage: 'Image or PDF',
  }),
  fileHelp: i18n.translate('xpack.contextEngine.sessionMemory.remember.fileHelp', {
    defaultMessage: 'PNG, JPEG, WebP, GIF, or PDF under 1 MB. Embedded with the content.',
  }),
  optional: i18n.translate('xpack.contextEngine.sessionMemory.remember.optional', {
    defaultMessage: 'Optional',
  }),
  submit: i18n.translate('xpack.contextEngine.sessionMemory.remember.submit', {
    defaultMessage: 'Remember',
  }),
};

export const buildRememberBody = (
  { sessionId, userId, agentId, spaceId, aiIndexIds }: SessionContextValue,
  { type, content, media }: { type: string; content: string; media?: SessionMemoryMediaItem }
): RememberSessionMemoryBody => ({
  session_id: sessionId.trim(),
  user_id: userId ?? '',
  agent_id: agentId.trim(),
  ...(spaceId ? { space: spaceId } : {}),
  ...(aiIndexIds.length ? { ai_index_id: aiIndexIds } : {}),
  ...(type.trim() ? { type: type.trim() } : {}),
  ...(content.trim() ? { content: content.trim() } : {}),
  ...(media ? { media: [media] } : {}),
});

const typeOptions = SESSION_MEMORY_TYPE_SUGGESTIONS.map((label) => ({ label }));

export const RememberMemoryPanel = () => {
  const session = useSessionContext();
  const [type, setType] = useState('');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<SessionMemoryMediaItem | undefined>();
  const { mutate, isLoading, data } = useRememberSessionMemory();

  const canSubmit = hasWriteIdentity(session) && (content.trim().length > 0 || media !== undefined);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    mutate(buildRememberBody(session, { type, content, media }));
  };

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextSessionMemoryRememberPanel">
      <PanelHeader
        iconType="save"
        title={
          <FormattedMessage
            id="xpack.contextEngine.sessionMemory.remember.title"
            defaultMessage="Remember"
          />
        }
        description={
          <FormattedMessage
            id="xpack.contextEngine.sessionMemory.remember.description"
            defaultMessage="Store a text memory, an image or PDF, or both. Media and text share one multimodal embedding, so a text search can find an image memory and vice versa."
          />
        }
      />
      <EuiForm component="form" onSubmit={submit}>
        <EuiFormRow label={labels.type} labelAppend={labels.optional} fullWidth>
          <EuiComboBox
            fullWidth
            compressed
            singleSelection={{ asPlainText: true }}
            options={typeOptions}
            selectedOptions={type ? [{ label: type }] : []}
            onChange={(selected) => setType(selected[0]?.label ?? '')}
            onCreateOption={(created) => setType(created.trim())}
            placeholder={labels.typePlaceholder}
            isDisabled={isLoading}
            data-test-subj="contextSessionMemoryRemember-type"
            aria-label={labels.type}
          />
        </EuiFormRow>
        <EuiFormRow label={labels.content} helpText={labels.contentHelp} fullWidth>
          <EuiTextArea
            fullWidth
            compressed
            rows={4}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={isLoading}
            data-test-subj="contextSessionMemoryRemember-content"
            aria-label={labels.content}
          />
        </EuiFormRow>
        <MediaFilePicker
          label={labels.file}
          helpText={labels.fileHelp}
          accept={MEDIA_FILE_ACCEPT}
          onChange={setMedia}
          isDisabled={isLoading}
          data-test-subj="contextSessionMemoryRemember-file"
        />
        <EuiSpacer size="m" />
        <EuiButton
          type="submit"
          fill
          isLoading={isLoading}
          isDisabled={!canSubmit}
          data-test-subj="contextSessionMemoryRemember-submit"
        >
          {labels.submit}
        </EuiButton>
      </EuiForm>
      {data && (
        <>
          <EuiSpacer size="m" />
          <KbnSuccessCallout
            announceOnMount
            title={i18n.translate('xpack.contextEngine.sessionMemory.remember.successTitle', {
              defaultMessage: 'Remembered memory {id} at {timestamp}',
              values: { id: data.id, timestamp: data['@timestamp'] },
            })}
            data-test-subj="contextSessionMemoryRemember-success"
          />
          <EuiSpacer size="s" />
          <SessionMemoryCard memory={data} data-test-subj="contextSessionMemoryRemember-stored" />
        </>
      )}
    </EuiPanel>
  );
};
