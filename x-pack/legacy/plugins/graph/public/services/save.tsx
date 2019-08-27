/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';
import { SavedGraphWorkspace } from '../types/persistence';
import { GraphSaveModal, OnSaveGraphProps } from '../components/graph_save_modal';

export function save(
  workspace: SavedGraphWorkspace,
  saveWorkspace: (saveOptions: {
    confirmOverwrite: boolean;
    isTitleDuplicateConfirmed: boolean;
    onTitleDuplicate: () => void;
  }) => Promise<{ id?: string } | { error: string }>
) {
  const currentTitle = workspace.title;
  const currentDescription = workspace.title;
  const onSave = ({
    newTitle,
    newDescription,
    newCopyOnSave,
    isTitleDuplicateConfirmed,
    onTitleDuplicate,
  }: OnSaveGraphProps) => {
    workspace.title = newTitle;
    workspace.description = newDescription;
    workspace.copyOnSave = newCopyOnSave;
    const saveOptions = {
      confirmOverwrite: false,
      isTitleDuplicateConfirmed,
      onTitleDuplicate,
    };
    return saveWorkspace(saveOptions).then(response => {
      // If the save wasn't successful, put the original values back.
      if (!('id' in response) || !Boolean(response.id)) {
        workspace.title = currentTitle;
        workspace.description = currentDescription;
      }
      return response;
    });
  };
  showSaveModal(
    <GraphSaveModal
      onSave={onSave}
      onClose={() => {}}
      title={workspace.title}
      description={workspace.description}
      showCopyOnSave={Boolean(workspace.id)}
    />
  );
}
