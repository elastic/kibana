/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, logicalCSS, useEuiTheme } from '@elastic/eui';
import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';
import { css } from '@emotion/react';

export interface EpisodesCountProps {
  count: number;
}

export const EpisodesCount = ({ count }: EpisodesCountProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiText
      grow={false}
      size="s"
      css={css`
        ${logicalCSS('padding-horizontal', euiTheme.size.s)}
      `}
      data-test-subj="alertingV2EpisodesCount"
    >
      <FormattedMessage
        id="xpack.alertingV2.episodes.toolbar.episodeCount"
        defaultMessage="{episodeCount} {count, plural, one {episode} other {episodes}}"
        values={{
          count,
          episodeCount: (
            <strong>
              <FormattedNumber value={count} />
            </strong>
          ),
        }}
      />
    </EuiText>
  );
};
