/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18nTexts as i18nTextsFlyout } from './i18n_texts';
import { SerializedDeletePhase } from '../../../../../../common/types';
import { i18nTexts } from '../../../edit_policy/i18n_texts';
import { ActionDescription } from './action_description';
import type { ActionComponentProps } from './types';

export const DeleteSearchableSnapshot = ({ phase, phases }: ActionComponentProps) => {
  const phaseConfig = phases[phase];
  const deleteSearchableSnapshot = (phaseConfig as SerializedDeletePhase)?.actions.delete
    ?.delete_searchable_snapshot;
  return (
    <ActionDescription
      title={i18nTexts.editPolicy.deleteSearchableSnapshotLabel}
      descriptionItems={[
        Boolean(deleteSearchableSnapshot) ? i18nTextsFlyout.yes : i18nTextsFlyout.no,
      ]}
    />
  );
};
