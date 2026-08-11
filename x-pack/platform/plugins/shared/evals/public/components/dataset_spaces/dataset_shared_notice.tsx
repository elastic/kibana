/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { useDatasetSharing, type DatasetSharing } from './use_dataset_sharing';
import * as i18n from './translations';

export type SharedDatasetAction =
  | 'edit-dataset'
  | 'add-example'
  | 'edit-example'
  | 'delete-example';

interface DatasetSharedNoticeProps {
  spaceIds?: string[];
  action: SharedDatasetAction;
}

const getScope = ({ isGlobal, spaceCount }: DatasetSharing): string =>
  isGlobal ? i18n.EVERY_SPACE_SCOPE : i18n.getSpaceCountScope(spaceCount);

const getMessage = (action: SharedDatasetAction, scope: string): string => {
  switch (action) {
    case 'edit-dataset':
      return i18n.getEditDatasetNotice(scope);
    case 'add-example':
      return i18n.getAddExampleNotice(scope);
    case 'edit-example':
      return i18n.getEditExampleNotice(scope);
    case 'delete-example':
      return i18n.getDeleteExampleNotice(scope);
  }
};

/**
 * Spells out that an edit reaches past the space being worked in. Renders
 * nothing for a dataset that only lives here.
 */
export const DatasetSharedNotice: React.FC<DatasetSharedNoticeProps> = ({ spaceIds, action }) => {
  const sharing = useDatasetSharing(spaceIds);
  const { isEnabled, isShared, isGlobal, otherSpaceNames, hiddenSpaceCount } = sharing;

  if (!isEnabled || !isShared) {
    return null;
  }

  return (
    <EuiCallOut
      size="s"
      color="warning"
      iconType="spaces"
      title={isGlobal ? i18n.ALL_SPACES_NOTICE_TITLE : i18n.SHARED_NOTICE_TITLE}
      data-test-subj="datasetSharedNotice"
    >
      <p>{getMessage(action, getScope(sharing))}</p>
      {!isGlobal && otherSpaceNames.length > 0 ? (
        <p>{i18n.getOtherSpacesSentence(otherSpaceNames)}</p>
      ) : null}
      {!isGlobal && hiddenSpaceCount > 0 ? (
        <p>{i18n.getHiddenSpacesSentence(hiddenSpaceCount)}</p>
      ) : null}
    </EuiCallOut>
  );
};
