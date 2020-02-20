/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { PropTypes } from 'prop-types';
import { EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { JobSelectorBadge } from '../job_selector_badge';
import { i18n } from '@kbn/i18n';

export function NewSelectionIdBadges({
  limit,
  maps,
  newSelection,
  onDeleteClick,
  onLinkClick,
  showAllBadges,
}) {
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
          isGroup={maps.groupsMap[newSelection[i]] !== undefined}
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

  return badges;
}
NewSelectionIdBadges.propTypes = {
  limit: PropTypes.number,
  maps: PropTypes.shape({
    jobsMap: PropTypes.object,
    groupsMap: PropTypes.object,
  }),
  newSelection: PropTypes.array,
  onDeleteClick: PropTypes.func,
  onLinkClick: PropTypes.func,
  showAllBadges: PropTypes.bool,
};
