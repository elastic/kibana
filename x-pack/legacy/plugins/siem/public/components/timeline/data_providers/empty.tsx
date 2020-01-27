/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiBadgeProps, EuiText } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { AndOrBadge } from '../../and_or_badge';

import * as i18n from './translations';

const Text = styled(EuiText)`
  overflow: hidden;
  margin: 5px 0 5px 0;
  padding: 3px;
  white-space: nowrap;
`;

Text.displayName = 'Text';

// Ref: https://github.com/elastic/eui/issues/1655
// const BadgeHighlighted = styled(EuiBadge)`
//   height: 20px;
//   margin: 0 5px 0 5px;
//   max-width: 70px;
//   min-width: 70px;
// `;
const BadgeHighlighted = (props: EuiBadgeProps) => (
  <EuiBadge
    {...props}
    style={{
      height: '20px',
      margin: '0 5px 0 5px',
      maxWidth: '85px',
      minWidth: '85px',
    }}
  />
);

BadgeHighlighted.displayName = 'BadgeHighlighted';

const HighlightedBackground = styled.span`
  background-color: ${props => props.theme.eui.euiColorLightShade};
`;

HighlightedBackground.displayName = 'HighlightedBackground';

const EmptyContainer = styled.div<{ showSmallMsg: boolean }>`
  width: ${props => (props.showSmallMsg ? '60px' : 'auto')};
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  user-select: none;
  align-content: center;
  ${props =>
    props.showSmallMsg
      ? `
      border-right: 1px solid ${props.theme.eui.euiColorMediumShade};
      margin-right: 10px;
    `
      : `
  min-height: 100px;
  + div {
    display: none !important;
   }
  `}
`;

EmptyContainer.displayName = 'EmptyContainer';

const NoWrap = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-wrap: no-wrap;
`;

NoWrap.displayName = 'NoWrap';
interface Props {
  showSmallMsg?: boolean;
}
/**
 * Prompts the user to drop anything with a facet count into the data providers section.
 */
export const Empty = React.memo<Props>(({ showSmallMsg = false }) => (
  <EmptyContainer
    className="timeline-drop-area-empty"
    data-test-subj="empty"
    showSmallMsg={showSmallMsg}
  >
    {!showSmallMsg && (
      <>
        <NoWrap>
          <Text color="subdued" size="s">
            {i18n.DROP_ANYTHING}
          </Text>
          <HighlightedBackground>
            <BadgeHighlighted>{i18n.HIGHLIGHTED}</BadgeHighlighted>
          </HighlightedBackground>
        </NoWrap>

        <NoWrap>
          <Text color="subdued" size="s">
            {i18n.HERE_TO_BUILD_AN}
          </Text>
          <AndOrBadge type="or" />
          <Text color="subdued" size="s">
            {i18n.QUERY}
          </Text>
        </NoWrap>
      </>
    )}
    {showSmallMsg && <AndOrBadge type="or" />}
  </EmptyContainer>
));

Empty.displayName = 'Empty';
