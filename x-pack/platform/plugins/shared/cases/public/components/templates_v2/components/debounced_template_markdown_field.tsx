/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { MarkdownEditor } from '../../markdown_editor';
import { ID as LensPluginId } from '../../markdown_editor/plugins/lens/constants';
import { useDebouncedFieldValue } from '../hooks/use_debounced_field_value';

interface DebouncedTemplateMarkdownFieldProps {
  label: ReactNode;
  ariaLabel: string;
  /** Source-of-truth value; the field re-syncs when it changes from outside (YAML edit, load). */
  value: string;
  /** Debounced — fired after the user pauses; also flushed on blur. */
  onChange: (value: string) => void;
  editorId: string;
  dataTestSubj: string;
}

// The case description is authored as markdown everywhere else in Cases (create case, legacy
// templates), so the default description must offer the same markdown editing experience rather than
// a plain textarea — otherwise migrated markdown defaults render as escaped plain text. The Lens
// plugin is disabled to match the create-case description editor (its embeds are not resolvable in a
// template default).
const disabledUiPlugins = [LensPluginId];

/**
 * A markdown editor whose keystrokes stay local to this component and only propagate (debounced) to
 * the parent on pause / blur — mirroring DebouncedTemplateTextField. Isolating the field this way
 * keeps typing instant even when the surrounding form is heavy (async comboboxes, YAML
 * re-serialization on change).
 */
export const DebouncedTemplateMarkdownField: React.FC<DebouncedTemplateMarkdownFieldProps> = ({
  label,
  ariaLabel,
  value,
  onChange,
  editorId,
  dataTestSubj,
}) => {
  const { value: localValue, setValue, flush } = useDebouncedFieldValue<string>(value, onChange);

  return (
    <EuiFormRow label={label} fullWidth>
      {/* React's onBlur bubbles from the inner textarea, so it flushes any pending debounced change
          the moment focus leaves the editor — guaranteeing Save sees the latest markdown. */}
      <div onBlur={flush}>
        <MarkdownEditor
          ariaLabel={ariaLabel}
          editorId={editorId}
          value={localValue}
          onChange={setValue}
          disabledUiPlugins={disabledUiPlugins}
          data-test-subj={dataTestSubj}
        />
      </div>
    </EuiFormRow>
  );
};

DebouncedTemplateMarkdownField.displayName = 'DebouncedTemplateMarkdownField';
