/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { GroupingMode, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AGGREGATE_STRATEGY_HELP_TEXT,
  AGGREGATE_STRATEGY_OPTIONS,
  PER_EPISODE_STRATEGY_HELP_TEXT,
  PER_EPISODE_STRATEGY_OPTIONS,
} from '../constants';

interface FrequencyHelpPopoverProps {
  groupingMode: GroupingMode;
}

const CLOSE_DELAY_MS = 150;

export const FrequencyHelpPopover = ({ groupingMode }: FrequencyHelpPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimeoutRef = useRef<number | undefined>();

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== undefined) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const openPopover = () => {
    if (closeTimeoutRef.current !== undefined) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = undefined;
    }
    setIsOpen(true);
  };

  const scheduleClose = () => {
    if (closeTimeoutRef.current !== undefined) {
      window.clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimeoutRef.current = undefined;
    }, CLOSE_DELAY_MS);
  };

  const options = useMemo(() => {
    const strategyOptions =
      groupingMode === 'per_episode' ? PER_EPISODE_STRATEGY_OPTIONS : AGGREGATE_STRATEGY_OPTIONS;
    const helpText =
      groupingMode === 'per_episode' ? PER_EPISODE_STRATEGY_HELP_TEXT : AGGREGATE_STRATEGY_HELP_TEXT;

    return strategyOptions.map(({ value, text }) => ({
      value,
      title: text,
      help: helpText[value as ThrottleStrategy],
    }));
  }, [groupingMode]);

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="upCenter"
      panelPaddingSize="m"
      button={
        <EuiButtonIcon
          iconType="info"
          color="primary"
          size="xs"
          aria-label={i18n.translate(
            'xpack.alertingV2.actionPolicy.form.dispatch.frequencyHelpAriaLabel',
            { defaultMessage: 'Frequency options help' }
          )}
          data-test-subj="frequencyHelpButton"
          onMouseEnter={openPopover}
          onMouseLeave={scheduleClose}
          onFocus={openPopover}
          onBlur={scheduleClose}
          onClick={openPopover}
        />
      }
      panelProps={{
        onMouseEnter: openPopover,
        onMouseLeave: scheduleClose,
      }}
    >
      <div style={{ maxWidth: 320 }} data-test-subj="frequencyHelpPanel">
        {options.map(({ value, title, help }, index) => (
          <React.Fragment key={value}>
            {index > 0 ? <EuiSpacer size="m" /> : null}
            <EuiFlexGroup gutterSize="xs" direction="column" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h5>{title}</h5>
                </EuiTitle>
              </EuiFlexItem>
              {help ? (
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    {help}
                  </EuiText>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </React.Fragment>
        ))}
      </div>
    </EuiPopover>
  );
};
