/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import type { A2uiMessage } from '@kbn/a2ui-renderer';

export interface PanelEditorFlyoutProps {
  panelId: string;
  title?: string;
  messages: A2uiMessage[];
  onClose: () => void;
  onSave: (next: { title?: string; messages: A2uiMessage[] }) => void;
}

export function PanelEditorFlyout({
  panelId,
  title,
  messages,
  onClose,
  onSave,
}: PanelEditorFlyoutProps) {
  const [draftTitle, setDraftTitle] = useState(title ?? '');
  const [draft, setDraft] = useState(() => JSON.stringify(messages, null, 2));
  const [error, setError] = useState<string | undefined>();

  const save = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch (e) {
      setError(`Invalid JSON: ${(e as Error).message}`);
      return;
    }
    if (!Array.isArray(parsed)) {
      setError('Expected an array of A2UI messages.');
      return;
    }
    onSave({ title: draftTitle.trim() || undefined, messages: parsed as A2uiMessage[] });
  };

  return (
    <EuiFlyout onClose={onClose} size="l" aria-labelledby="customAppPanelEditorTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="customAppPanelEditorTitle">Edit panel</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFormRow label="Panel title" fullWidth>
          <EuiFieldText
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            fullWidth
            placeholder={panelId}
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        {error && (
          <>
            <EuiCallOut announceOnMount color="danger" size="s" title={error} />
            <EuiSpacer size="s" />
          </>
        )}

        <EuiFormRow
          label="A2UI messages"
          helpText="An array of A2UI v1.0 messages. Exactly one component must have the id 'root'."
          fullWidth
        >
          <div css={{ height: 520 }}>
            <CodeEditor
              languageId="json"
              value={draft}
              onChange={(value) => {
                setDraft(value);
                setError(undefined);
              }}
              height="520px"
              options={{ minimap: { enabled: false }, tabSize: 2, automaticLayout: true }}
            />
          </div>
        </EuiFormRow>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left">
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={save} fill iconType="save">
              Apply
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
