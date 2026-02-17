/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiIcon, euiFontSize } from '@elastic/eui';
import { css } from '@emotion/react';
import { transparentize } from 'polished';

import type { QuerySuggestion } from '@kbn/kql/public';
import { QuerySuggestionTypes } from '@kbn/kql/public';

interface Props {
  isSelected?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  suggestion: QuerySuggestion;
}

export const SuggestionItem: React.FC<Props> = ({
  isSelected = false,
  onClick,
  onMouseEnter,
  suggestion,
}) => {
  return (
    // TODO: should be focusable and have relevant key events; try using an existing component from EUI
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      css={suggestionItemContainerStyle(isSelected)}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <div css={suggestionItemIconFieldStyle(suggestion.type)}>
        <EuiIcon type={getEuiIconType(suggestion.type)} />
      </div>
      <div css={suggestionItemTextFieldStyle}>{suggestion.text}</div>
      <div css={suggestionItemDescriptionFieldStyle}>{suggestion.description}</div>
    </div>
  );
};

const suggestionItemContainerStyle = (isSelected?: boolean) => (theme: UseEuiTheme) =>
  css`
    display: flex;
    flex-direction: row;
    font-size: ${euiFontSize(theme, 's').fontSize};
    height: ${theme.euiTheme.size.xl};
    white-space: nowrap;
    background-color: ${isSelected ? theme.euiTheme.colors.lightestShade : 'transparent'};
  `;

const suggestionItemFieldStyle = ({ euiTheme }: UseEuiTheme) => css`
  align-items: center;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  height: ${euiTheme.size.xl};
  padding: ${euiTheme.size.xs};
`;

const suggestionItemIconFieldStyle =
  (suggestionType: QuerySuggestionTypes) => (theme: UseEuiTheme) =>
    css`
      ${suggestionItemFieldStyle(theme)};
      background-color: ${transparentize(0.9, getEuiIconColor(theme, suggestionType))};
      color: ${getEuiIconColor(theme, suggestionType)};
      flex: 0 0 auto;
      justify-content: center;
      width: ${theme.euiTheme.size.xl};
    `;

const suggestionItemTextFieldStyle = (theme: UseEuiTheme) => css`
  ${suggestionItemFieldStyle(theme)};
  flex: 2 0 0;
  font-family: ${theme.euiTheme.font.familyCode};
`;

const suggestionItemDescriptionFieldStyle = (theme: UseEuiTheme) => css`
  ${suggestionItemFieldStyle(theme)};
  flex: 3 0 0;

  p {
    display: inline;

    span {
      font-family: ${theme.euiTheme.font.familyCode};
    }
  }
`;

const getEuiIconType = (suggestionType: QuerySuggestionTypes) => {
  switch (suggestionType) {
    case QuerySuggestionTypes.Field:
      return 'kqlField';
    case QuerySuggestionTypes.Value:
      return 'kqlValue';
    case QuerySuggestionTypes.RecentSearch:
      return 'search';
    case QuerySuggestionTypes.Conjunction:
      return 'kqlSelector';
    case QuerySuggestionTypes.Operator:
      return 'kqlOperand';
    default:
      return 'empty';
  }
};

const getEuiIconColor = (
  { euiTheme }: UseEuiTheme,
  suggestionType: QuerySuggestionTypes
): string => {
  switch (suggestionType) {
    case QuerySuggestionTypes.Field:
      return euiTheme.colors.vis.euiColorVis7;
    case QuerySuggestionTypes.Value:
      return euiTheme.colors.vis.euiColorVis0;
    case QuerySuggestionTypes.Operator:
      return euiTheme.colors.vis.euiColorVis1;
    case QuerySuggestionTypes.Conjunction:
      return euiTheme.colors.vis.euiColorVis2;
    case QuerySuggestionTypes.RecentSearch:
    default:
      return euiTheme.colors.mediumShade;
  }
};
