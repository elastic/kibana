/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBetaBadge, EuiBadge, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';

import { DraggableArguments, BadgeOptions, TitleProp } from './types';
import { DefaultDraggable } from '../draggables';

const StyledEuiBetaBadge = styled(EuiBetaBadge)`
  vertical-align: middle;
`;

StyledEuiBetaBadge.displayName = 'StyledEuiBetaBadge';

const Badge = styled(EuiBadge)`
  letter-spacing: 0;
`;
Badge.displayName = 'Badge';

interface Props {
  badgeOptions?: BadgeOptions;
  title: TitleProp;
  draggableArguments?: DraggableArguments;
}

const TitleComponent: React.FC<Props> = ({ draggableArguments, title, badgeOptions }) => (
  <EuiTitle size="l">
    <h1 data-test-subj="header-page-title">
      {!draggableArguments ? (
        title
      ) : (
        <DefaultDraggable
          data-test-subj="header-page-draggable"
          id={`header-page-draggable-${draggableArguments.field}-${draggableArguments.value}`}
          field={draggableArguments.field}
          value={`${draggableArguments.value}`}
        />
      )}
      {badgeOptions && (
        <>
          {' '}
          {badgeOptions.beta ? (
            <StyledEuiBetaBadge
              label={badgeOptions.text}
              tooltipContent={badgeOptions.tooltip}
              tooltipPosition="bottom"
            />
          ) : (
            <Badge color="hollow">{badgeOptions.text}</Badge>
          )}
        </>
      )}
    </h1>
  </EuiTitle>
);

export const Title = React.memo(TitleComponent);
