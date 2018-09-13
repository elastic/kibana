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

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { QueryLanguageSwitcher } from './language_switcher';
import { toUser, fromUser } from '../../parse_query/index.js';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
} from '@elastic/eui';

export class QueryBar extends Component {

  /*
   Keep the "draft" value in local state until the user actually submits the query. There are a couple advantages:

    1. Each app doesn't have to maintain its own "draft" value if it wants to put off updating the query in app state
    until the user manually submits their changes. Most apps have watches on the query value in app state so we don't
    want to trigger those on every keypress. Also, some apps (e.g. dashboard) already juggle multiple query values,
    each with slightly different semantics and I'd rather not add yet another variable to the mix.

    2. Changes to the local component state won't trigger an Angular digest cycle. Triggering digest cycles on every
    keypress has been a major source of performance issues for us in previous implementations of the query bar.
    See https://github.com/elastic/kibana/issues/14086
  */
  state = {
    query: {
      query: toUser(this.props.query.query),
      language: this.props.query.language,
    },
  };

  onChange = (event) => {
    this.setState({
      query: {
        query: event.target.value,
        language: this.state.query.language,
      },
    });
  };

  componentWillReceiveProps(nextProps) {
    if (nextProps.query.query !== this.props.query.query) {
      this.setState({
        query: {
          query: toUser(nextProps.query.query),
          language: nextProps.query.language,
        },
      });
    }
    else if (nextProps.query.language !== this.props.query.language) {
      this.setState({
        query: {
          query: '',
          language: nextProps.query.language,
        },
      });
    }
  }

  render() {
    return (
      <form
        role="form"
        name="queryBarForm"
        onSubmit={(e) => {
          e.preventDefault();
          this.props.onSubmit({
            query: fromUser(this.state.query.query),
            language: this.state.query.language,
          });
        }
        }
      >
        <div
          className="kuiLocalSearch"
          role="search"
        >
          <div className="kuiLocalSearchAssistedInput">
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFieldText
                  placeholder="Search..."
                  value={this.state.query.query}
                  onChange={this.onChange}
                  fullWidth
                  autoFocus={!this.props.disableAutoFocus}
                />
                <div className="kuiLocalSearchAssistedInput__assistance">
                  <QueryLanguageSwitcher
                    language={this.state.query.language}
                    onSelectLanguage={(language) => {
                      this.props.onSubmit({
                        query: '',
                        language: language,
                      });
                    }}
                  />
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </div>
      </form>
    );
  }
}


QueryBar.propTypes = {
  query: PropTypes.shape({
    query: PropTypes.string,
    language: PropTypes.string,
  }),
  onSubmit: PropTypes.func,
  disableAutoFocus: PropTypes.bool,
};
