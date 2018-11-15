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

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import classNames from 'classnames';
import React, { SFC } from 'react';
import { MetaFilter } from 'ui/filter_bar/filters/meta_filter';
import { FilterBar } from 'ui/filter_bar/react';
import { IndexPattern } from 'ui/index_patterns';
import { QueryBar } from 'ui/query_bar';
import { Storage } from 'ui/storage';

interface Props {
  query: {
    query: string;
    language: string;
  };
  onQuerySubmit: (query: { query: string | object; language: string }) => void;
  disableAutoFocus?: boolean;
  appName: string;
  indexPatterns: IndexPattern[];
  store: Storage;
  filters: MetaFilter[];
  onToggleFilterNegate: (filter: MetaFilter) => void;
  onToggleFilterDisabled: (filter: MetaFilter) => void;
  onToggleFilterPin: (filter: MetaFilter) => void;
  onFilterDelete: (filter: MetaFilter) => void;
}

export const SearchBar: SFC<Props> = props => {
  const classes = classNames('globalFilterGroup__wrapper', {
    'globalFilterGroup__wrapper-isVisible': true,
  });

  return (
    <div>
      <QueryBar
        query={props.query}
        onSubmit={props.onQuerySubmit}
        appName={props.appName}
        indexPatterns={props.indexPatterns}
        store={props.store}
      />

      <div
        id="GlobalFilterGroup"
        // ref={node => { this.filterBarWrapper = node; }}
        className={classes}
      >
        <div>
          <EuiFlexGroup
            className="globalFilterGroup"
            gutterSize="none"
            alignItems="flexStart"
            responsive={false}
          >
            {/*<EuiFlexItem className="globalFilterGroup__branch" grow={false}>*/}
            {/*<GlobalFilterOptions />*/}
            {/*</EuiFlexItem>*/}

            <EuiFlexItem>
              <FilterBar
                className="globalFilterGroup__filterBar"
                filters={props.filters}
                onTogglePin={props.onToggleFilterPin}
                onToggleDisabled={props.onToggleFilterDisabled}
                onDelete={props.onFilterDelete}
                onToggleNegate={props.onToggleFilterNegate}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    </div>
  );
};
