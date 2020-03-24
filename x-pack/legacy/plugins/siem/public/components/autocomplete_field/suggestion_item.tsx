/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import { transparentize } from 'polished';
import React from 'react';
import styled from 'styled-components';
import euiStyled from '../../../../../common/eui_styled_components';
import { QuerySuggestion } from '../../../../../../../src/plugins/data/public';

interface SuggestionItemProps {
  isSelected?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  suggestion: QuerySuggestion;
}

export const SuggestionItem = React.memo<SuggestionItemProps>(
  ({ isSelected = false, onClick, onMouseEnter, suggestion }) => {
    return (
      <SuggestionItemContainer
        isSelected={isSelected}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        data-test-subj="suggestion-item"
      >
        <SuggestionItemIconField suggestionType={suggestion.type}>
          <EuiIcon type={getEuiIconType(suggestion.type)} />
        </SuggestionItemIconField>
        <SuggestionItemTextField>{suggestion.text}</SuggestionItemTextField>
        <SuggestionItemDescriptionField>{suggestion.description}</SuggestionItemDescriptionField>
      </SuggestionItemContainer>
    );
  }
);

SuggestionItem.displayName = 'SuggestionItem';

const SuggestionItemContainer = euiStyled.div<{
  isSelected?: boolean;
}>`
  display: flex;
  flex-direction: row;
  font-size: ${props => props.theme.eui.euiFontSizeS};
  height: ${props => props.theme.eui.euiSizeXL};
  white-space: nowrap;
  background-color: ${props =>
    props.isSelected ? props.theme.eui.euiColorLightestShade : 'transparent'};
`;

SuggestionItemContainer.displayName = 'SuggestionItemContainer';

const SuggestionItemField = euiStyled.div`
  align-items: center;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  height: ${props => props.theme.eui.euiSizeXL};
  padding: ${props => props.theme.eui.euiSizeXS};
`;

SuggestionItemField.displayName = 'SuggestionItemField';

const SuggestionItemIconField = styled(SuggestionItemField)<{ suggestionType: string }>`
  background-color: ${props =>
    transparentize(0.9, getEuiIconColor(props.theme, props.suggestionType))};
  color: ${props => getEuiIconColor(props.theme, props.suggestionType)};
  flex: 0 0 auto;
  justify-content: center;
  width: ${props => props.theme.eui.euiSizeXL};
`;

SuggestionItemIconField.displayName = 'SuggestionItemIconField';

const SuggestionItemTextField = styled(SuggestionItemField)`
  flex: 2 0 0;
  font-family: ${props => props.theme.eui.euiCodeFontFamily};
`;

SuggestionItemTextField.displayName = 'SuggestionItemTextField';

const SuggestionItemDescriptionField = styled(SuggestionItemField)`
  flex: 3 0 0;

  p {
    display: inline;

    span {
      font-family: ${props => props.theme.eui.euiCodeFontFamily};
    }
  }
`;

SuggestionItemDescriptionField.displayName = 'SuggestionItemDescriptionField';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getEuiIconColor = (theme: any, suggestionType: string): string => {
  switch (suggestionType) {
    case 'field':
      return theme.eui.euiColorVis7;
    case 'value':
      return theme.eui.euiColorVis0;
    case 'operator':
      return theme.eui.euiColorVis1;
    case 'conjunction':
      return theme.eui.euiColorVis2;
    case 'recentSearch':
    default:
      return theme.eui.euiColorMediumShade;
  }
};
