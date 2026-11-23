/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiPopover,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getFailureTooltip } from '@kbn/lens-common';
import type { FormBasedEsqlAvailability } from '../../../datasources/form_based/esql_availability';

const POPOVER_WIDTH = 320;

const optionsLabel = i18n.translate('xpack.lens.config.esqlOptions.label', {
  defaultMessage: 'ES|QL options',
});

const fallbackToDslLabel = i18n.translate('xpack.lens.config.esqlOptions.fallbackToDslLabel', {
  defaultMessage: 'ES|QL options: this chart falls back to DSL',
});

export interface EsqlOptionsPopoverProps {
  /** Persisted per-chart setting. */
  useEsql: boolean;
  /** Whether every data layer of the chart can be fetched with ES|QL. */
  availability: FormBasedEsqlAvailability;
  onUseEsqlChange: (useEsql: boolean) => void;
  /** Omit to hide the conversion action, for example while the conversion feature flag is off. */
  convertToEsql?: {
    isDisabled: boolean;
    tooltip: string;
    onClick: () => void;
  };
}

export const EsqlOptionsPopover = ({
  useEsql,
  availability,
  onUseEsqlChange,
  convertToEsql,
}: EsqlOptionsPopoverProps) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  const closePopover = () => setIsOpen(false);

  // A chart that has ES|QL on but can no longer use it must still be able to switch it off.
  const isSwitchDisabled = !availability.isAvailable && !useEsql;

  const unavailableMessage = availability.isAvailable
    ? undefined
    : getFailureTooltip(availability.reason).message;

  const unavailableDescription = useEsql
    ? i18n.translate('xpack.lens.config.esqlOptions.fallbackToDslDescription', {
        defaultMessage: 'This chart currently fetches data with DSL. {reason}',
        values: { reason: unavailableMessage },
      })
    : i18n.translate('xpack.lens.config.esqlOptions.unavailableDescription', {
        defaultMessage: 'ES|QL is not available for this chart. {reason}',
        values: { reason: unavailableMessage },
      });

  // Neutral by default; a warning only when ES|QL is requested but the chart cannot use it.
  const isFallingBackToDsl = useEsql && !availability.isAvailable;
  const triggerLabel = isFallingBackToDsl ? fallbackToDslLabel : optionsLabel;

  const trigger = (
    <EuiToolTip position="top" content={triggerLabel} disableScreenReaderOutput>
      <EuiButtonIcon
        color={isFallingBackToDsl ? 'warning' : 'text'}
        display="base"
        size="s"
        iconType="code"
        aria-label={triggerLabel}
        data-test-subj="lnsEsqlOptionsButton"
        onClick={() => setIsOpen((wasOpen) => !wasOpen)}
      />
    </EuiToolTip>
  );

  return (
    <EuiPopover
      aria-label={optionsLabel}
      button={trigger}
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downRight"
      panelPaddingSize="m"
      data-test-subj="lnsEsqlOptionsPopover"
    >
      <div
        css={css`
          inline-size: ${POPOVER_WIDTH}px;
        `}
      >
        <EuiSwitch
          label={i18n.translate('xpack.lens.config.esqlOptions.useEsqlSwitchLabel', {
            defaultMessage: 'Use ES|QL to fetch data',
          })}
          checked={useEsql}
          disabled={isSwitchDisabled}
          onChange={(event) => onUseEsqlChange(event.target.checked)}
          data-test-subj="lnsEsqlOptionsUseEsqlSwitch"
        />
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            margin-block-start: ${euiTheme.size.xs};
          `}
        >
          <p>
            {i18n.translate('xpack.lens.config.esqlOptions.useEsqlDescription', {
              defaultMessage:
                'Fetches data with ES|QL behind the scenes. The chart configuration stays the same.',
            })}
          </p>
        </EuiText>
        {unavailableMessage ? (
          <EuiText
            size="xs"
            color="warning"
            css={css`
              margin-block-start: ${euiTheme.size.s};
            `}
            data-test-subj="lnsEsqlOptionsUnavailableReason"
          >
            <p>{unavailableDescription}</p>
          </EuiText>
        ) : null}
        {convertToEsql ? (
          <>
            <EuiHorizontalRule margin="m" />
            <EuiToolTip position="bottom" content={convertToEsql.tooltip}>
              <EuiButton
                size="s"
                iconType="code"
                isDisabled={convertToEsql.isDisabled}
                onClick={() => {
                  closePopover();
                  convertToEsql.onClick();
                }}
                data-test-subj="lnsEsqlOptionsConvertButton"
              >
                {i18n.translate('xpack.lens.config.esqlOptions.convertToEsqlButtonLabel', {
                  defaultMessage: 'Convert to ES|QL',
                })}
              </EuiButton>
            </EuiToolTip>
          </>
        ) : null}
      </div>
    </EuiPopover>
  );
};
