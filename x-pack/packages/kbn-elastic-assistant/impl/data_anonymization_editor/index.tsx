/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';

import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';
import type { SelectedPromptContext } from '../assistant/prompt_context/types';
import { ContextEditor } from './context_editor';
import { BatchUpdateListItem } from './context_editor/types';
import { getIsDataAnonymizable } from './helpers';
import { ReadOnlyContextViewer } from './read_only_context_viewer';
import { Stats } from './stats';

const EditorContainer = styled.div`
  overflow-x: auto;
`;

export interface Props {
  selectedPromptContext: SelectedPromptContext;
  setSelectedPromptContexts: React.Dispatch<
    React.SetStateAction<Record<string, SelectedPromptContext>>
  >;
}

const DataAnonymizationEditorComponent: React.FC<Props> = ({
  selectedPromptContext,
  setSelectedPromptContexts,
}) => {
  const isDataAnonymizable = useMemo<boolean>(
    () => getIsDataAnonymizable(selectedPromptContext.rawData),
    [selectedPromptContext]
  );

  const onListUpdated = useCallback((updates: BatchUpdateListItem[]) => {
    /* const updatedPromptContext = updates.reduce<SelectedPromptContext>(
        (acc, { field, operation, update }) =>
          updateSelectedPromptContext({
            field,
            operation,
            selectedPromptContext: acc,
            update,
          }),
        selectedPromptContext
      );

      setSelectedPromptContexts((prev) => ({
        ...prev,
        [selectedPromptContext.promptContextId]: updatedPromptContext,
      }));

      updateDefaults({
        defaultAllow,
        defaultAllowReplacement,
        setDefaultAllow,
        setDefaultAllowReplacement,
        updates,
      });
      */
  }, []);

  return (
    <EditorContainer data-test-subj="dataAnonymizationEditor">
      <Stats
        isDataAnonymizable={isDataAnonymizable}
        selectedPromptContext={selectedPromptContext}
      />

      <EuiSpacer size="s" />

      {typeof selectedPromptContext.rawData === 'string' ? (
        <ReadOnlyContextViewer rawData={selectedPromptContext.rawData} />
      ) : (
        <ContextEditor
          anonymizationFields={
            selectedPromptContext.anonymizationFields as FindAnonymizationFieldsResponse
          }
          onListUpdated={onListUpdated}
          rawData={selectedPromptContext.rawData}
        />
      )}
    </EditorContainer>
  );
};

export const DataAnonymizationEditor = React.memo(DataAnonymizationEditorComponent);
