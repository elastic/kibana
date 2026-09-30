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
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { customAppDefinitionSchema } from '../../common/app_definition';
import type { CustomAppDefinition } from '../../common/app_definition';

export interface AppEditorFlyoutProps {
  definition: CustomAppDefinition;
  onClose: () => void;
  onApply: (next: CustomAppDefinition) => void;
}

/**
 * Edits the whole app document. The per-panel editor is the common case, but
 * layout, queries and the panel set only exist at this level — and it is also
 * the fastest way to see exactly what an agent produced.
 */
export function AppEditorFlyout({ definition, onClose, onApply }: AppEditorFlyoutProps) {
  const [draft, setDraft] = useState(() => JSON.stringify(definition, null, 2));
  const [error, setError] = useState<string | undefined>();

  /**
   * Parsed from the editor text rather than held separately, so the switch and
   * the JSON can never disagree. While the text is unparseable the switch has
   * nothing to reflect and is disabled.
   */
  const parsed = useMemo(() => {
    try {
      return JSON.parse(draft) as CustomAppDefinition;
    } catch {
      return undefined;
    }
  }, [draft]);

  const setShowInNav = (showInNav: boolean) => {
    if (!parsed) return;
    setDraft(JSON.stringify({ ...parsed, showInNav }, null, 2));
    setError(undefined);
  };

  const apply = () => {
    if (!parsed) {
      setError('Invalid JSON: the document could not be parsed.');
      return;
    }

    // Validate with the same schema the API enforces, so the editor cannot
    // produce something the server would later reject.
    const result = customAppDefinitionSchema.safeParse(parsed);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    onApply(result.data);
  };

  return (
    <EuiFlyout onClose={onClose} size="l" aria-labelledby="customAppEditorTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="customAppEditorTitle">Settings</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>
            The complete app document — layout, panels, ES|QL queries and every panel&apos;s
            components.
          </p>
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiSwitch
          label="Show this app in the navigation menu"
          checked={parsed?.showInNav === true}
          disabled={!parsed}
          onChange={(e) => setShowInNav(e.target.checked)}
        />
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          <p>Adds a link under Custom apps in the left navigation. Takes effect once you save.</p>
        </EuiText>
        <EuiSpacer size="m" />

        {error && (
          <>
            <EuiCallOut announceOnMount color="danger" size="s" title="This document is not valid">
              <pre css={{ whiteSpace: 'pre-wrap', margin: 0 }}>{error}</pre>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        <div css={{ height: 'calc(100vh - 260px)' }}>
          <CodeEditor
            languageId="json"
            value={draft}
            onChange={(value) => {
              setDraft(value);
              setError(undefined);
            }}
            height="100%"
            options={{ minimap: { enabled: false }, tabSize: 2, automaticLayout: true }}
          />
        </div>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left">
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={apply} fill iconType="save">
              Apply
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
