/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { useEuiTheme } from '@elastic/eui';
import { CodeEditor, monaco } from '@kbn/code-editor';

import { i18n } from '@kbn/i18n';
import { initializeOsqueryEditor } from './osquery_highlight_rules';
import { useOsqueryTables } from './osquery_tables';
import { useKibana } from '../common/lib/kibana';

interface OsqueryEditorProps {
  defaultValue: string;
  onChange: (newValue: string) => void;
  commands?: Array<{
    name: string;
    exec: () => void;
  }>;
}

const editorOptions = {
  automaticLayout: true,
};
const MIN_HEIGHT = 100;
const OsqueryEditorComponent: React.FC<OsqueryEditorProps> = ({
  defaultValue,
  onChange,
  commands,
}) => {
  const { euiTheme } = useEuiTheme();
  const { hotkeys } = useKibana().services;
  const { tableNames, tablesRecord } = useOsqueryTables();
  const [editorValue, setEditorValue] = useState(defaultValue ?? '');
  const [height, setHeight] = useState(MIN_HEIGHT);

  // Monaco's overflow widgets (autocomplete suggestions) are rendered via a portal to document.body.
  // By default, the CodeEditor only detects flyouts (z-index 1000) and sets z-index to 1100.
  // When the editor is inside a modal (z-index 8000), suggestions appear behind the modal.
  // Override to render above modals in all contexts.
  const overflowWidgetsZIndex = (euiTheme.levels.modal as number) + 1;

  const containerStyle = useMemo(
    () => ({
      border: euiTheme.border.thin,
      borderRadius: euiTheme.border.radius.medium,
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      overflow: 'hidden' as const,
    }),
    [euiTheme.border.thin, euiTheme.border.radius.medium, euiTheme.colors.backgroundBaseSubdued]
  );

  useDebounce(
    () => {
      onChange(editorValue);
    },
    500,
    [editorValue]
  );

  useEffect(() => setEditorValue(defaultValue), [defaultValue]);

  useEffect(() => {
    const disposable = initializeOsqueryEditor(tableNames, tablesRecord);

    return () => {
      disposable?.dispose();
    };
  }, [tableNames, tablesRecord]);

  const editorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      const minHeight = 100;
      const maxHeight = 1000;

      commands?.map((command) => {
        if (command.name === 'submitOnCmdEnter') {
          // on CMD/CTRL + Enter submit the query
          // eslint-disable-next-line no-bitwise
          editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, command.exec, {
            id: 'osqueryEditor:monaco.submitQuery',
            label: i18n.translate('xpack.osquery.editor.submitQueryShortcutLabel', {
              defaultMessage: 'Run query',
            }),
            featureId: 'osquery:editor',
            group: i18n.translate('xpack.osquery.editor.shortcutsGroup', {
              defaultMessage: 'Query editor',
            }),
            scope: 'context',
          });
        }
      });

      const updateHeight = () => {
        const contentHeight = Math.min(maxHeight, Math.max(minHeight, editor.getContentHeight()));
        setHeight(contentHeight);
      };

      editor.onDidContentSizeChange(updateHeight);
    },
    [commands]
  );

  return (
    <div style={containerStyle}>
      <CodeEditor
        languageId={'sql'}
        value={editorValue}
        onChange={setEditorValue}
        options={editorOptions}
        height={height + 'px'}
        width="100%"
        hotkeys={hotkeys}
        editorDidMount={editorDidMount}
        overflowWidgetsContainerZIndexOverride={overflowWidgetsZIndex}
        transparentBackground
      />
    </div>
  );
};

export const OsqueryEditor = React.memo(OsqueryEditorComponent);
