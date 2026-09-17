/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiCopy, EuiLink, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

/**
 * Number of leading characters rendered. Ids are uuids, so the first few
 * characters are enough to tell two of them apart at a glance.
 */
export const SHORT_ID_LENGTH = 7;

export interface CopyableShortIdProps {
  /** The full id. Copied whole, but only the first characters are rendered. */
  id: string;
  /** Tooltip content. Should spell out the full id. */
  copyTooltip: string;
  /** Tooltip shown right after copying. Not used when `disableCopy` is set. */
  copiedTooltip?: string;
  /**
   * Drops the copy click and keeps the tooltip. Needed when the chip sits inside
   * something already clickable, like a card link, where a nested link does not work.
   */
  disableCopy?: boolean;
  'data-test-subj'?: string;
}

/**
 * Renders the leading characters of an id as a code chip that copies the full value on click.
 */
export const CopyableShortId = ({
  id,
  copyTooltip,
  copiedTooltip,
  disableCopy = false,
  'data-test-subj': dataTestSubj,
}: CopyableShortIdProps) => {
  const { euiTheme } = useEuiTheme();

  const chip = (
    <EuiCode
      css={css`
        display: inline-flex;
        align-items: center;
        padding-block: 0;
        padding-inline: ${euiTheme.size.xs};
        line-height: ${euiTheme.size.base};
        font-weight: ${euiTheme.font.weight.regular};
        color: ${euiTheme.colors.textSubdued};
      `}
    >
      {id.slice(0, SHORT_ID_LENGTH)}
    </EuiCode>
  );

  if (disableCopy) {
    return (
      <EuiToolTip content={copyTooltip}>
        <span data-test-subj={dataTestSubj} tabIndex={0}>
          {chip}
        </span>
      </EuiToolTip>
    );
  }

  return (
    <EuiCopy textToCopy={id} beforeMessage={copyTooltip} afterMessage={copiedTooltip}>
      {(copy) => (
        // Nothing to navigate to
        // eslint-disable-next-line @elastic/eui/require-href-for-link
        <EuiLink color="subdued" onClick={copy} data-test-subj={dataTestSubj}>
          {chip}
        </EuiLink>
      )}
    </EuiCopy>
  );
};
