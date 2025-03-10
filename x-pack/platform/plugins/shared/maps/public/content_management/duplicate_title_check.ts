/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { OverlayStart } from '@kbn/core/public';

import type { MapAttributes } from '../../common/content_management';
import { getMapClient } from './maps_client';

const rejectErrorMessage = i18n.translate('xpack.maps.saveDuplicateRejectedDescription', {
  defaultMessage: 'Save with duplicate title confirmation was rejected',
});

interface Props {
  title: string;
  id?: string;
  getDisplayName: () => string;
  onTitleDuplicate: () => void;
  lastSavedTitle: string;
  copyOnSave: boolean;
  isTitleDuplicateConfirmed: boolean;
}

interface Context {
  overlays: OverlayStart;
}

export const checkForDuplicateTitle = async (
  {
    id,
    title,
    lastSavedTitle,
    copyOnSave,
    isTitleDuplicateConfirmed,
    getDisplayName,
    onTitleDuplicate,
  }: Props,
  { overlays }: Context
) => {
  if (isTitleDuplicateConfirmed) {
    return true;
  }

  if (title === lastSavedTitle && !copyOnSave) {
    return true;
  }

  const { hits } = await getMapClient<MapAttributes>().search(
    {
      text: `"${title}"`,
      limit: 10,
    },
    { onlyTitle: true }
  );

  const existing = hits.find((obj) => obj.attributes.title.toLowerCase() === title.toLowerCase());

  if (!existing || existing.id === id) {
    return true;
  }

  onTitleDuplicate();
  return Promise.reject(new Error(rejectErrorMessage));
};
