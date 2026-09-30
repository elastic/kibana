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
import { z } from '@kbn/zod';
import type { A2uiMessage } from '@kbn/a2ui-renderer';
import { esqlQuerySchema } from '../../common/app_definition';
import type { EsqlQuery } from '../../common/app_definition';

export interface PanelEditorFlyoutProps {
  panelId: string;
  title?: string;
  messages: A2uiMessage[];
  /**
   * Queries are stored app-wide and keyed by panel id, not inside the A2UI
   * messages — the protocol has no notion of a data source. They are edited here
   * anyway, because the query and the components that bind to it are one thing
   * to reason about, and hunting for the panel's key in the whole-app JSON is
   * not a reasonable way to change a query.
   */
  queries: EsqlQuery[];
  onClose: () => void;
  onSave: (next: { title?: string; messages: A2uiMessage[]; queries: EsqlQuery[] }) => void;
}

const queriesSchema = z.array(esqlQuerySchema);

export function PanelEditorFlyout({
  panelId,
  title,
  messages,
  queries,
  onClose,
  onSave,
}: PanelEditorFlyoutProps) {
  const [draftTitle, setDraftTitle] = useState(title ?? '');
  const [draft, setDraft] = useState(() => JSON.stringify(messages, null, 2));
  const [draftQueries, setDraftQueries] = useState(() => JSON.stringify(queries, null, 2));
  const [error, setError] = useState<string | undefined>();

  const save = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch (e) {
      setError(`Invalid JSON in the components: ${(e as Error).message}`);
      return;
    }
    if (!Array.isArray(parsed)) {
      setError('Expected an array of A2UI messages.');
      return;
    }

    let parsedQueries: unknown;
    try {
      parsedQueries = JSON.parse(draftQueries.trim() === '' ? '[]' : draftQueries);
    } catch (e) {
      setError(`Invalid JSON in the queries: ${(e as Error).message}`);
      return;
    }
    // Validated with the same schema the API enforces, so the editor cannot
    // produce a query the server would later reject.
    const result = queriesSchema.safeParse(parsedQueries);
    if (!result.success) {
      setError(`The queries are not valid: ${result.error.message}`);
      return;
    }

    onSave({
      title: draftTitle.trim() || undefined,
      messages: parsed as A2uiMessage[],
      queries: result.data,
    });
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
          label="ES|QL queries"
          helpText={`Each entry runs and writes its result into the data model at 'path', where this panel's components bind to it. 'shape' is rows, groups, first or value; 'params' maps an ES|QL named parameter to a data model path.`}
          fullWidth
        >
          <div css={{ height: 200 }}>
            <CodeEditor
              languageId="json"
              value={draftQueries}
              onChange={(value) => {
                setDraftQueries(value);
                setError(undefined);
              }}
              height="200px"
              options={{ minimap: { enabled: false }, tabSize: 2, automaticLayout: true }}
            />
          </div>
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiFormRow
          label="A2UI messages"
          helpText="An array of A2UI v1.0 messages. Exactly one component must have the id 'root'."
          fullWidth
        >
          <div css={{ height: 420 }}>
            <CodeEditor
              languageId="json"
              value={draft}
              onChange={(value) => {
                setDraft(value);
                setError(undefined);
              }}
              height="420px"
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
