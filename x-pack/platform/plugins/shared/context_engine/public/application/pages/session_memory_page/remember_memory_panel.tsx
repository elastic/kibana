/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnSuccessCallout } from '@kbn/ui-callout';
import React, { useState } from 'react';
import type {
  RememberSessionMemoryBody,
  SessionMemoryMediaItem,
} from '../../../../common/http_api/session_memory';
import { useRememberSessionMemory } from '../../hooks/use_session_memory_mutations';
import { MEDIA_FILE_ACCEPT } from './media_file';
import { MediaFilePicker } from './media_file_picker';
import { EMPTY_SESSION_SCOPE, SessionScopeFields, hasRequiredScope } from './session_scope_fields';
import type { SessionScope } from './session_scope_fields';

const labels = {
  type: i18n.translate('xpack.contextEngine.sessionMemory.remember.type', {
    defaultMessage: 'Type',
  }),
  typePlaceholder: i18n.translate('xpack.contextEngine.sessionMemory.remember.typePlaceholder', {
    defaultMessage: 'e.g. preference',
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
  scope: SessionScope,
  { type, content, media }: { type: string; content: string; media?: SessionMemoryMediaItem }
): RememberSessionMemoryBody => ({
  session_id: scope.sessionId.trim(),
  user_id: scope.userId.trim(),
  agent_id: scope.agentId.trim(),
  ...(scope.space.trim() ? { space: scope.space.trim() } : {}),
  ...(scope.aiIndexIds.length ? { ai_index_id: scope.aiIndexIds } : {}),
  ...(type.trim() ? { type: type.trim() } : {}),
  ...(content.trim() ? { content: content.trim() } : {}),
  ...(media ? { media: [media] } : {}),
});

export const RememberMemoryPanel = () => {
  const [scope, setScope] = useState<SessionScope>(EMPTY_SESSION_SCOPE);
  const [type, setType] = useState('');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<SessionMemoryMediaItem | undefined>();
  const { mutate, isLoading, data } = useRememberSessionMemory();

  const canSubmit = hasRequiredScope(scope) && (content.trim().length > 0 || media !== undefined);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    mutate(buildRememberBody(scope, { type, content, media }));
  };

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextSessionMemoryRememberPanel">
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.contextEngine.sessionMemory.remember.title"
            defaultMessage="Remember"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.contextEngine.sessionMemory.remember.description"
            defaultMessage="Store a text memory, an image or PDF, or both. Media and text share one multimodal embedding, so a text search can find an image memory and vice versa."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiForm component="form" onSubmit={submit}>
        <SessionScopeFields
          value={scope}
          onChange={setScope}
          required
          isDisabled={isLoading}
          data-test-subj="contextSessionMemoryRemember"
        />
        <EuiFormRow label={labels.type} labelAppend={labels.optional} fullWidth>
          <EuiFieldText
            fullWidth
            compressed
            value={type}
            onChange={(event) => setType(event.target.value)}
            placeholder={labels.typePlaceholder}
            disabled={isLoading}
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
        </>
      )}
    </EuiPanel>
  );
};
