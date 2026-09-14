/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiPopover, EuiSpacer, EuiText } from '@elastic/eui';
import type { GroupingMode } from '@kbn/alerting-v2-schemas';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import {
  AGGREGATE_STRATEGY_HELP_TEXT,
  AGGREGATE_STRATEGY_OPTIONS,
  PER_EPISODE_STRATEGY_HELP_TEXT,
  PER_EPISODE_STRATEGY_OPTIONS,
} from '../constants';

interface FrequencyHelpTipProps {
  groupingMode: GroupingMode;
}

const panelStyle = css`
  max-inline-size: 360px;
`;

/**
 * Info icon shown next to the Frequency label. On hover, click, or keyboard focus it opens a
 * panel listing every frequency option available for the current notify-per mode, each with its
 * explanation, replacing the per-field helper text.
 */
export const FrequencyHelpTip = ({ groupingMode }: FrequencyHelpTipProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const options =
    groupingMode === 'per_episode' ? PER_EPISODE_STRATEGY_OPTIONS : AGGREGATE_STRATEGY_OPTIONS;
  const helpText =
    groupingMode === 'per_episode' ? PER_EPISODE_STRATEGY_HELP_TEXT : AGGREGATE_STRATEGY_HELP_TEXT;

  const ariaLabel = i18n.translate(
    'xpack.alertingV2.actionPolicy.form.dispatch.frequency.helpAriaLabel',
    { defaultMessage: 'Frequency options explained' }
  );

  const button = (
    <EuiButtonIcon
      iconType="info"
      color="text"
      aria-label={ariaLabel}
      data-test-subj="frequencyHelpTip"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
      onClick={() => setIsOpen((open) => !open)}
    />
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="upCenter"
      panelPaddingSize="m"
      ownFocus={false}
    >
      <div css={panelStyle} data-test-subj="frequencyHelpTipContent">
        {options.map((option, index) => (
          <React.Fragment key={option.value}>
            {index > 0 ? <EuiSpacer size="m" /> : null}
            <EuiText size="s">
              <strong>{option.text}</strong>
            </EuiText>
            <EuiText size="s" color="subdued">
              {helpText[option.value]}
            </EuiText>
          </React.Fragment>
        ))}
      </div>
    </EuiPopover>
  );
};
