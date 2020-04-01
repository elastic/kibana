/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import { tint } from 'polished';
import React from 'react';
import styled from 'styled-components';

import { QuerySuggestion } from '../../../../../../../src/plugins/data/public';

interface SuggestionItemProps {
  isSelected?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  suggestion: QuerySuggestion;
}

export const SuggestionItem: React.FC<SuggestionItemProps> = props => {
  const { isSelected, onClick, onMouseEnter, suggestion } = props;

  return (
    <SuggestionItemContainer isSelected={isSelected} onClick={onClick} onMouseEnter={onMouseEnter}>
      <SuggestionItemIconField suggestionType={suggestion.type}>
        <EuiIcon type={getEuiIconType(suggestion.type)} />
      </SuggestionItemIconField>
      <SuggestionItemTextField>{suggestion.text}</SuggestionItemTextField>
      <SuggestionItemDescriptionField>{suggestion.description}</SuggestionItemDescriptionField>
    </SuggestionItemContainer>
  );
};

SuggestionItem.defaultProps = {
  isSelected: false,
};

const SuggestionItemContainer = styled.div<{
  isSelected?: boolean;
}>`
  display: flex;
  flex-direction: row;
  font-size: ${props => props.theme.eui.default.euiFontSizeS};
  height: ${props => props.theme.eui.default.euiSizeXl};
  white-space: nowrap;
  background-color: ${props =>
    props.isSelected ? props.theme.eui.default.euiColorLightestShade : 'transparent'};
`;

const SuggestionItemField = styled.div`
  align-items: center;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  height: ${props => props.theme.eui.default.euiSizeXl};
  padding: ${props => props.theme.eui.default.euiSizeXs};
`;

const SuggestionItemIconField = styled(SuggestionItemField)<{ suggestionType: string }>`
  background-color: ${props => {
    return tint(0.1, getEuiIconColor(props.theme, props.suggestionType));
  }};
  color: ${props => {
    return getEuiIconColor(props.theme, props.suggestionType);
  }};
  flex: 0 0 auto;
  justify-content: center;
  width: ${props => props.theme.eui.default.euiSizeXl};
`;

const SuggestionItemTextField = styled(SuggestionItemField)`
  flex: 2 0 0;
  font-family: ${props => props.theme.eui.default.euiCodeFontFamily};
`;

const SuggestionItemDescriptionField = styled(SuggestionItemField)`
  flex: 3 0 0;
  p {
    display: inline;
    span {
      font-family: ${props => props.theme.eui.default.euiCodeFontFamily};
    }
  }
`;

const getEuiIconType = (suggestionType: string) => {
  switch (suggestionType) {
    case 'field':
      return 'kqlField';
    case 'value':
      return 'kqlValue';
    case 'recentSearch':
      return 'search';
    case 'conjunction':
      return 'kqlSelector';
    case 'operator':
      return 'kqlOperand';
    default:
      return 'empty';
  }
};

const getEuiIconColor = (theme: any, suggestionType: string): string => {
  switch (suggestionType) {
    case 'field':
      return theme.eui.default.euiColorVis7;
    case 'value':
      return theme.eui.default.euiColorVis0;
    case 'operator':
      return theme.eui.default.euiColorVis1;
    case 'conjunction':
      return theme.eui.default.euiColorVis2;
    case 'recentSearch':
    default:
      return theme.eui.default.euiColorMediumShade;
  }
};
