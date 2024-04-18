/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { AnonymizedData } from '@kbn/elastic-assistant-common/impl/data_anonymization/types';
import type { SelectedPromptContext } from '../assistant/prompt_context/types';
import { BatchUpdateListItem } from './context_editor/types';
import { getIsDataAnonymizable, updateSelectedPromptContext } from './helpers';
import { ReadOnlyContextViewer } from './read_only_context_viewer';
import { ContextEditorFlyout } from './context_editor_flyout';
import { ContextEditor } from './context_editor';
import { ReplacementsContextViewer } from './replacements_context_viewer';
import { Stats } from './stats';

const EditorContainer = styled.div`
  overflow-x: auto;
`;

export interface Props {
  selectedPromptContext: SelectedPromptContext;
  setSelectedPromptContexts: React.Dispatch<
    React.SetStateAction<Record<string, SelectedPromptContext>>
  >;
  currentReplacements: AnonymizedData['replacements'] | undefined;
  isFlyoutMode: boolean;
}

const DataAnonymizationEditorComponent: React.FC<Props> = ({
  selectedPromptContext,
  setSelectedPromptContexts,
  currentReplacements,
  isFlyoutMode,
}) => {
  const isDataAnonymizable = useMemo<boolean>(
    () => getIsDataAnonymizable(selectedPromptContext.rawData),
    [selectedPromptContext]
  );

  const onListUpdated = useCallback(
    (updates: BatchUpdateListItem[]) => {
      const updatedPromptContext = updates.reduce<SelectedPromptContext>(
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
    },
    [selectedPromptContext, setSelectedPromptContexts]
  );

  if (isFlyoutMode) {
    return (
      <EditorContainer data-test-subj="dataAnonymizationEditor">
        <EuiPanel hasShadow={false} paddingSize="m">
          {typeof selectedPromptContext.rawData === 'string' ? (
            selectedPromptContext.replacements != null ? (
              <ReplacementsContextViewer
                markdown={selectedPromptContext.rawData}
                replacements={selectedPromptContext.replacements}
              />
            ) : (
              <ReadOnlyContextViewer rawData={selectedPromptContext.rawData} />
            )
          ) : (
            <ContextEditorFlyout
              selectedPromptContext={selectedPromptContext}
              onListUpdated={onListUpdated}
              currentReplacements={currentReplacements}
              isDataAnonymizable={isDataAnonymizable}
            />
          )}
        </EuiPanel>
      </EditorContainer>
    );
  }

  return (
    <EditorContainer data-test-subj="dataAnonymizationEditor">
      <Stats
        isDataAnonymizable={isDataAnonymizable}
        anonymizationFields={selectedPromptContext.contextAnonymizationFields?.data}
        rawData={selectedPromptContext.rawData}
        replacements={selectedPromptContext.replacements}
      />

      <EuiSpacer size="s" />

      {typeof selectedPromptContext.rawData === 'string' ? (
        selectedPromptContext.replacements != null ? (
          <ReplacementsContextViewer
            markdown={selectedPromptContext.rawData}
            replacements={selectedPromptContext.replacements}
          />
        ) : (
          <ReadOnlyContextViewer rawData={selectedPromptContext.rawData} />
        )
      ) : (
        <ContextEditor
          anonymizationFields={
            selectedPromptContext.contextAnonymizationFields ?? {
              total: 0,
              page: 1,
              perPage: 1000,
              data: [],
            }
          }
          onListUpdated={onListUpdated}
          rawData={selectedPromptContext.rawData}
        />
      )}
    </EditorContainer>
  );
};

export const DataAnonymizationEditor = React.memo(DataAnonymizationEditorComponent);
