/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SerializedHotPhase, SerializedWarmPhase } from '../../../../../../common/types';
import { i18nTexts } from '../../../edit_policy/i18n_texts';
import { i18nTexts as i18nTextsFlyout } from './i18n_texts';
import type { ActionComponentProps } from './types';
import { ActionDescription } from './action_description';

export const Shrink = ({ phase, phases }: ActionComponentProps) => {
  const phaseConfig = phases[phase];
  const shrink = (phaseConfig as SerializedHotPhase | SerializedWarmPhase)?.actions.shrink;
  const descriptionItems = [];
  if (shrink?.number_of_shards) {
    descriptionItems.push(
      <>
        {`${i18nTexts.editPolicy.shrinkNumberOfShardsLabel}: `}
        <strong>{shrink.number_of_shards}</strong>
      </>
    );
  }
  if (shrink?.max_primary_shard_size) {
    descriptionItems.push(
      <>
        {`${i18nTexts.editPolicy.maxPrimaryShardSizeLabel}: `}
        <strong>{shrink.max_primary_shard_size}</strong>
      </>
    );
  }

  descriptionItems.push(
    <>
      {`${i18nTexts.editPolicy.allowWriteAfterShrinkLabel}: `}
      <strong>{shrink?.allow_write_after_shrink ? i18nTextsFlyout.yes : i18nTextsFlyout.no}</strong>
    </>
  );

  return shrink ? (
    <ActionDescription
      title={i18nTexts.editPolicy.shrinkActionLabel}
      descriptionItems={descriptionItems}
    />
  ) : null;
};
