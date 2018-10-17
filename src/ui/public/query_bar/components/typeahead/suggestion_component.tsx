/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EuiIcon } from '@elastic/eui';
import classNames from 'classnames';
import React, { SFC } from 'react';
import { AutocompleteSuggestion } from 'ui/autocomplete_providers';

function getEuiIconType(type: string) {
  switch (type) {
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
      throw new Error(`Unknown type: ${type}`);
  }
}

interface Props {
  onClick: (suggestion: AutocompleteSuggestion) => void;
  onMouseEnter: () => void;
  selected: boolean;
  suggestion: AutocompleteSuggestion;
  innerRef: (node: HTMLDivElement) => void;
  ariaId: string;
}

export const SuggestionComponent: SFC<Props> = props => {
  return (
    <div
      className={classNames({
        'typeahead-item': true,
        active: props.selected,
      })}
      role="option"
      onClick={() => props.onClick(props.suggestion)}
      onMouseEnter={props.onMouseEnter}
      ref={props.innerRef}
      id={props.ariaId}
    >
      <div className={'suggestionItem suggestionItem--' + props.suggestion.type}>
        <div className="suggestionItem__type">
          <EuiIcon type={getEuiIconType(props.suggestion.type)} />
        </div>
        <div className="suggestionItem__text">{props.suggestion.text}</div>
        <div
          className="suggestionItem__description"
          // Description currently always comes from us and we escape any potential user input
          // at the time we're generating the description text
          // eslint-disable-next-line react/no-danger
          // @ts-ignore
          dangerouslySetInnerHTML={{ __html: props.suggestion.description }}
        />
      </div>
    </div>
  );
};
