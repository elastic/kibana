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

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
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
    query: this.props.query,
    language: this.props.language,
  };

  onChange = (event) => {
    this.setState({
      query: event.target.value,
    });
  };

  componentWillReceiveProps(nextProps) {
    if (nextProps.query !== this.props.query) {
      this.setState({
        query: nextProps.query,
        language: nextProps.language,
      });
    }
    else if (nextProps.language !== nextProps.language) {
      this.setState({
        query: '',
        language: nextProps.language,
      });
    }
  }

  render() {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          {/*Need an onChange to update state, but should this be a stateful component or should it call a callback */}
          <EuiFieldSearch
            placeholder="Search..."
            value={this.state.query}
            onChange={this.onChange}
            onSearch={this.props.onSubmit}
            fullWidth
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
