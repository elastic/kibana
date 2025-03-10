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

export const Forcemerge = ({ phase, phases }: ActionComponentProps) => {
  const phaseConfig = phases[phase];
  const forcemerge = (phaseConfig as SerializedHotPhase | SerializedWarmPhase)?.actions.forcemerge;
  return forcemerge ? (
    <ActionDescription
      title={i18nTexts.editPolicy.forceMergeLabel}
      descriptionItems={[
        <>
          {`${i18nTexts.editPolicy.maxNumSegmentsFieldLabel}: `}
          <strong>{forcemerge.max_num_segments}</strong>
        </>,
        <>
          {`${i18nTexts.editPolicy.bestCompressionFieldLabel}: `}
          <strong>
            {forcemerge.index_codec === 'best_compression'
              ? i18nTextsFlyout.yes
              : i18nTextsFlyout.no}
          </strong>
        </>,
      ]}
    />
  ) : null;
};
