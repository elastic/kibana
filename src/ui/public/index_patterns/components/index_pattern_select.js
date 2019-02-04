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

import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import chrome from 'ui/chrome';

import { EuiComboBox } from '@elastic/eui';

const getIndexPatterns = async (search, fields) => {
  const resp = await chrome.getSavedObjectsClient().find({
    type: 'index-pattern',
    fields,
    search: `${search}*`,
    search_fields: ['title'],
    perPage: 100
  });
  return resp.savedObjects;
};

const getIndexPatternTitle = async (indexPatternId) => {
  const savedObject = await chrome.getSavedObjectsClient().get('index-pattern', indexPatternId);
  if (savedObject.error) {
    throw new Error(`Unable to get index-pattern title: ${savedObject.error.message}`);
  }
  return savedObject.attributes.title;
};

export class IndexPatternSelect extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: false,
      options: [],
      selectedIndexPattern: undefined,
      searchValue: undefined,
    };
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.debouncedFetch.cancel();
  }

  componentDidMount() {
    this._isMounted = true;
    this.fetchOptions();
    this.fetchSelectedIndexPattern(this.props.indexPatternId);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.indexPatternId !== this.props.indexPatternId) {
      this.fetchSelectedIndexPattern(nextProps.indexPatternId);
    }
  }

  fetchSelectedIndexPattern = async (indexPatternId) => {
    if (!indexPatternId) {
      this.setState({
        selectedIndexPattern: undefined
      });
      return;
    }

    let indexPatternTitle;
    try {
      indexPatternTitle = await getIndexPatternTitle(indexPatternId);
    } catch (err) {
      // index pattern no longer exists
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({
      selectedIndexPattern: {
        value: indexPatternId,
        label: indexPatternTitle,
      }
    });
  }

  debouncedFetch = _.debounce(async (searchValue) => {
    const { fieldTypes, onNoIndexPatterns } = this.props;

    const savedObjectFields = ['title'];
    if (fieldTypes) {
      savedObjectFields.push('fields');
    }
    let savedObjects = await getIndexPatterns(searchValue, savedObjectFields);

    if (fieldTypes) {
      savedObjects = savedObjects.filter(savedObject => {
        try {
          const indexPatternFields = JSON.parse(savedObject.attributes.fields);
          return indexPatternFields.some(({ type }) => {
            return fieldTypes.includes(type);
          });
        } catch (err) {
          // Unable to parse fields JSON, invalid index pattern
          return false;
        }
      });
    }

    if (!this._isMounted) {
      return;
    }

    // We need this check to handle the case where search results come back in a different
    // order than they were sent out. Only load results for the most recent search.
    if (searchValue === this.state.searchValue) {
      const options = savedObjects.map((indexPatternSavedObject) => {
        return {
          label: indexPatternSavedObject.attributes.title,
          value: indexPatternSavedObject.id
        };
      });
      this.setState({
        isLoading: false,
        options,
      });

      if (onNoIndexPatterns && searchValue === '' && options.length === 0) {
        onNoIndexPatterns();
      }
    }
  }, 300);

  fetchOptions = (searchValue = '') => {
    this.setState({
      isLoading: true,
      searchValue
    }, this.debouncedFetch.bind(null, searchValue));
  }

  onChange = (selectedOptions) => {
    this.props.onChange(_.get(selectedOptions, '0.value'));
  }

  render() {
    const {
      fieldTypes, // eslint-disable-line no-unused-vars
      onChange, // eslint-disable-line no-unused-vars
      indexPatternId, // eslint-disable-line no-unused-vars
      placeholder,
      onNoIndexPatterns, // eslint-disable-line no-unused-vars
      ...rest
    } = this.props;

    return (
      <EuiComboBox
        placeholder={placeholder}
        singleSelection={true}
        isLoading={this.state.isLoading}
        onSearchChange={this.fetchOptions}
        options={this.state.options}
        selectedOptions={this.state.selectedIndexPattern ? [this.state.selectedIndexPattern] : []}
        onChange={this.onChange}
        {...rest}
      />
    );
  }
}

IndexPatternSelect.propTypes = {
  onChange: PropTypes.func.isRequired,
  indexPatternId: PropTypes.string,
  placeholder: PropTypes.string,
  /**
   * Filter index patterns to only those that include the field types
   */
  fieldTypes: PropTypes.arrayOf(PropTypes.string),
  /**
   * Callback called when there are no Kibana index patterns (or none that match the field types filter).
   * Does not get called when user provided index pattern title search does match any index patterns.
   */
  onNoIndexPatterns: PropTypes.func,
};
