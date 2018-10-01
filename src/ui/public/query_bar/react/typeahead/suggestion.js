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

import React from 'react';
import PropTypes from 'prop-types';
import { EuiIcon } from '@elastic/eui';
import classNames from 'classnames';

function getEuiIconType(type) {
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
      throw new Error('Unknown type', type);
  }
}

export function Suggestion(props) {
  return (
    <div
      className={classNames({
        'typeahead-item': true,
        active: props.selected,
      })}
      onClick={() => props.onClick(props.suggestion)}
      onMouseEnter={props.onMouseEnter}
    >
      <div className={'suggestionItem suggestionItem--' + props.suggestion.type}>
        <div className="suggestionItem__type" type={props.suggestion.type}>
          <EuiIcon type={getEuiIconType(props.suggestion.type)}/>
        </div>
        <div className="suggestionItem__text">{props.suggestion.text}</div>
        <div
          className="suggestionItem__description"
          // Description currently always comes from us and we escape any potential user input
          // at the time we're generating the description text
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: props.suggestion.description }}
        />
      </div>
    </div>
  );
}


Suggestion.propTypes = {
  onClick: PropTypes.func.isRequired,
  onMouseEnter: PropTypes.func.isRequired,
  selected: PropTypes.bool,
  suggestion: PropTypes.object.isRequired,
};

