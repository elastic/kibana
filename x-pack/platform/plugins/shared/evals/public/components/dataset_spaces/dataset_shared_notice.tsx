/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useDatasetSharing } from './use_dataset_sharing';
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
 * How far an edit to a shared dataset reaches.
 */
export const getSharedNoticeCopy = (
  spaceIds: string[] | undefined,
  action: SharedDatasetAction
): { title: string; message: string } => ({
  title: i18n.SHARED_NOTICE_TITLE,
  message: getMessage(action, i18n.getSpaceCountScope((spaceIds ?? []).length)),
});

/**
 * Spells out that an edit reaches past the space being worked in. Renders
 * nothing for a dataset that only lives here.
 */
export const DatasetSharedNotice: React.FC<DatasetSharedNoticeProps> = ({ spaceIds, action }) => {
  const { isEnabled, isShared } = useDatasetSharing(spaceIds);
  const { title, message } = getSharedNoticeCopy(spaceIds, action);

  if (!isEnabled || !isShared) {
    return null;
  }

  return (
    <KbnWarningCallout size="s" title={title} data-test-subj="datasetSharedNotice" text={message} />
  );
};
