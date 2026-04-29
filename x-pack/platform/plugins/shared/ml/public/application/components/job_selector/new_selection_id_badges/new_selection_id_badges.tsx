/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, MouseEventHandler } from 'react';
import React from 'react';
import { EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { JobSelectorBadge } from '../job_selector_badge';
import type { MlJobGroupWithTimeRange } from '../job_selector_flyout';

export interface NewSelectionIdBadgesProps {
  limit: number;
  newSelection: string[];
  onDeleteClick?: Function;
  onLinkClick?: MouseEventHandler<HTMLAnchorElement>;
  showAllBadges?: boolean;
  groups: MlJobGroupWithTimeRange[];
}

export const NewSelectionIdBadges: FC<NewSelectionIdBadgesProps> = ({
  limit,
  newSelection,
  onDeleteClick,
  onLinkClick,
  showAllBadges,
  groups,
}) => {
  const badges = [];

  for (let i = 0; i < newSelection.length; i++) {
    if (i >= limit && showAllBadges === false) {
      break;
    }

    badges.push(
      <EuiFlexItem grow={false} key={newSelection[i]}>
        <JobSelectorBadge
          id={newSelection[i]}
          icon={true}
          isGroup={groups.some((g) => g.id === newSelection[i])}
          removeId={onDeleteClick}
        />
      </EuiFlexItem>
    );
  }

  if (showAllBadges === false && newSelection.length > limit) {
    badges.push(
      <EuiLink key="more-badges-link" onClick={onLinkClick}>
        <EuiText grow={false} size="xs">
          {i18n.translate('xpack.ml.jobSelector.showFlyoutBadges', {
            defaultMessage: `And {overFlow} more`,
            values: { overFlow: newSelection.length - limit },
          })}
        </EuiText>
      </EuiLink>
    );
  } else if (showAllBadges === true && newSelection.length > limit) {
    badges.push(
      <EuiLink key="hide-badges-link" onClick={onLinkClick}>
        <EuiText grow={false} size="xs">
          {i18n.translate('xpack.ml.jobSelector.hideFlyoutBadges', {
            defaultMessage: 'Hide',
          })}
        </EuiText>
      </EuiLink>
    );
  }

  return <>{badges}</>;
};
