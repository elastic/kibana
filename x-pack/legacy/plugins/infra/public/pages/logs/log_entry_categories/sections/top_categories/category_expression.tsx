/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';

import euiStyled from '../../../../../../../../common/eui_styled_components';

export const RegularExpressionRepresentation: React.FunctionComponent<{
  regularExpression: string;
}> = memo(({ regularExpression }) => {
  const segments = regularExpression.split(collapsedRegularExpressionCharacters);

  return (
    <CategoryPattern>
      {segments.map((segment, segmentIndex) => [
        segmentIndex > 0 ? (
          <CategoryPatternWildcard key={`wildcard-${segmentIndex}`}>⁕</CategoryPatternWildcard>
        ) : null,
        <CategoryPatternSegment key={`segment-${segmentIndex}`}>
          {segment.replace(escapedRegularExpressionCharacters, '$1')}
        </CategoryPatternSegment>,
      ])}
    </CategoryPattern>
  );
});

const CategoryPattern = euiStyled.span`
  font-family: ${props => props.theme.eui.euiCodeFontFamily};
  word-break: break-all;
`;

const CategoryPatternWildcard = euiStyled.span`
  color: ${props => props.theme.eui.euiColorMediumShade};
`;

const CategoryPatternSegment = euiStyled.span`
  font-weight: bold;
`;

const collapsedRegularExpressionCharacters = /\.[+*]\??/g;

const escapedRegularExpressionCharacters = /\\([\\^$*+?.()\[\]])/g;
