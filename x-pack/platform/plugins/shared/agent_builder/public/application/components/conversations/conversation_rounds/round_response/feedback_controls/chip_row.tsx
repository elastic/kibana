/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FeedbackChipId } from '@kbn/agent-builder-common';

interface Chip {
  id: FeedbackChipId;
  label: string;
}

const DOWN_CHIPS: Chip[] = [
  {
    id: 'inaccurate',
    label: i18n.translate('xpack.agentBuilder.feedback.chip.inaccurate', {
      defaultMessage: 'Inaccurate',
    }),
  },
  {
    id: 'incomplete',
    label: i18n.translate('xpack.agentBuilder.feedback.chip.incomplete', {
      defaultMessage: 'Incomplete',
    }),
  },
  {
    id: 'didnt_follow_instructions',
    label: i18n.translate('xpack.agentBuilder.feedback.chip.didntFollowInstructions', {
      defaultMessage: "Didn't follow instructions",
    }),
  },
];

const UP_CHIPS: Chip[] = [
  {
    id: 'accurate',
    label: i18n.translate('xpack.agentBuilder.feedback.chip.accurate', {
      defaultMessage: 'Accurate',
    }),
  },
  {
    id: 'useful',
    label: i18n.translate('xpack.agentBuilder.feedback.chip.useful', {
      defaultMessage: 'Useful',
    }),
  },
  {
    id: 'well_explained',
    label: i18n.translate('xpack.agentBuilder.feedback.chip.wellExplained', {
      defaultMessage: 'Well-explained',
    }),
  },
];

interface ChipRowProps {
  vote: 'up' | 'down';
  selected: FeedbackChipId[];
  onToggle: (chip: FeedbackChipId) => void;
}

export const ChipRow: React.FC<ChipRowProps> = ({ vote, selected, onToggle }) => {
  const chips = vote === 'down' ? DOWN_CHIPS : UP_CHIPS;

  const idToSelectedMap = Object.fromEntries(chips.map(({ id }) => [id, selected.includes(id)]));

  return (
    <EuiButtonGroup
      type="multi"
      legend={i18n.translate('xpack.agentBuilder.feedback.chipRow.legend', {
        defaultMessage: 'Feedback options',
      })}
      options={chips.map(({ id, label }) => ({
        id,
        label,
        'data-test-subj': `roundFeedbackChip-${id}`,
      }))}
      idToSelectedMap={idToSelectedMap}
      onChange={(id) => onToggle(id as FeedbackChipId)}
      buttonSize="compressed"
    />
  );
};
