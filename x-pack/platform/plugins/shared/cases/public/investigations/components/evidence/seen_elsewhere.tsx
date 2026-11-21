/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { IndicatorLookupResponse } from '../../../../common/investigations/types';
import { useInvestigationsNavigation } from '../../hooks';
import { ICONS } from '../../icons';
import * as i18n from './translations';

export type SeenElsewhereInfo = IndicatorLookupResponse['values'][string];

export interface SeenElsewhereListProps {
  info: SeenElsewhereInfo;
}

/** Links to the other investigations that hold the same indicator. */
export const SeenElsewhereList: React.FC<SeenElsewhereListProps> = ({ info }) => {
  const { euiTheme } = useEuiTheme();
  const { getRecordPath, getHref, navigate } = useInvestigationsNavigation();

  return (
    <ul
      css={css`
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.xs};
      `}
    >
      {info.records.map((other) => {
        const path = getRecordPath(other.id, { tab: 'evidence' });
        return (
          <li key={other.id}>
            <EuiLink
              href={getHref(path)}
              onClick={(event: React.MouseEvent) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
                  return;
                }
                event.preventDefault();
                navigate(path);
              }}
              data-test-subj={`investigationEvidenceSeenRecord-${other.display_id}`}
            >
              {other.display_id}
            </EuiLink>{' '}
            <EuiText size="xs" color="subdued" component="span">
              {other.title}
            </EuiText>
          </li>
        );
      })}
      {info.count > info.records.length ? (
        <li>
          <EuiText size="xs" color="subdued">
            {i18n.SEEN_MORE(info.count - info.records.length)}
          </EuiText>
        </li>
      ) : null}
    </ul>
  );
};
SeenElsewhereList.displayName = 'SeenElsewhereList';

export interface SeenElsewhereCellProps {
  info: SeenElsewhereInfo | undefined;
  /** Icon and count only, with the full sentence as the accessible name. */
  compact?: boolean;
}

/** "Seen in N other investigations" with a popover listing them. Empty when none. */
export const SeenElsewhereCell: React.FC<SeenElsewhereCellProps> = ({ info, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!info || info.count === 0) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.NO_VALUE}
      </EuiText>
    );
  }

  return (
    <EuiPopover
      aria-label={i18n.SEEN_IN_OTHER(info.count)}
      button={
        <EuiButtonEmpty
          size="xs"
          flush="left"
          iconType={ICONS.related}
          onClick={(event: React.MouseEvent) => {
            event.stopPropagation();
            setIsOpen((open) => !open);
          }}
          aria-label={compact ? i18n.SEEN_IN_OTHER(info.count) : undefined}
          title={compact ? i18n.SEEN_IN_OTHER(info.count) : undefined}
          data-test-subj="investigationEvidenceSeenElsewhere"
        >
          {compact ? String(info.count) : i18n.SEEN_IN_OTHER(info.count)}
        </EuiButtonEmpty>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
    >
      <EuiPopoverTitle>{i18n.SEEN_IN_OTHER_TITLE}</EuiPopoverTitle>
      <SeenElsewhereList info={info} />
    </EuiPopover>
  );
};
SeenElsewhereCell.displayName = 'SeenElsewhereCell';
