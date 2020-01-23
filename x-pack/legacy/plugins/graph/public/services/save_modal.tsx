/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { GraphWorkspaceSavedObject, GraphSavePolicy } from '../types';
import { SaveModal, OnSaveGraphProps } from '../components/save_modal';
import { SaveResult } from '../legacy_imports';

export type SaveWorkspaceHandler = (
  saveOptions: {
    confirmOverwrite: boolean;
    isTitleDuplicateConfirmed: boolean;
    onTitleDuplicate: () => void;
  },
  dataConsent: boolean
) => Promise<SaveResult>;

export function openSaveModal({
  savePolicy,
  hasData,
  workspace,
  saveWorkspace,
  showSaveModal,
}: {
  savePolicy: GraphSavePolicy;
  hasData: boolean;
  workspace: GraphWorkspaceSavedObject;
  saveWorkspace: SaveWorkspaceHandler;
  showSaveModal: (el: React.ReactNode) => void;
}) {
  const currentTitle = workspace.title;
  const currentDescription = workspace.description;
  const onSave = ({
    newTitle,
    newDescription,
    newCopyOnSave,
    isTitleDuplicateConfirmed,
    onTitleDuplicate,
    dataConsent,
  }: OnSaveGraphProps) => {
    workspace.title = newTitle;
    workspace.description = newDescription;
    workspace.copyOnSave = newCopyOnSave;
    const saveOptions = {
      confirmOverwrite: false,
      isTitleDuplicateConfirmed,
      onTitleDuplicate,
    };
    return saveWorkspace(saveOptions, dataConsent).then(response => {
      // If the save wasn't successful, put the original values back.
      if (!('id' in response) || !Boolean(response.id)) {
        workspace.title = currentTitle;
        workspace.description = currentDescription;
      }
      return response;
    });
  };
  showSaveModal(
    <SaveModal
      savePolicy={savePolicy}
      hasData={hasData}
      onSave={onSave}
      onClose={() => {}}
      title={workspace.title}
      description={workspace.description}
      showCopyOnSave={Boolean(workspace.id)}
    />
  );
}
