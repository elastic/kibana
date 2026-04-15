/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiListGroupItem } from '@elastic/eui';
import * as i18n from './translations';

export interface AlertEpisodeTagsMenuItemProps {
  isDisabled: boolean;
  onOpen: () => void;
}

export function AlertEpisodeTagsMenuItem({ isDisabled, onOpen }: AlertEpisodeTagsMenuItemProps) {
  return (
    <EuiListGroupItem
      label={i18n.TAGS_ACTION_EDIT_TAGS}
      size="s"
      iconType="tag"
      onClick={onOpen}
      isDisabled={isDisabled}
      data-test-subj="alertingEpisodeActionsTagsButton"
    />
  );
}
