/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { uniqueId } from 'lodash';
import { FilterBar } from './filter_bar';
import { EuiCallOut, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getSuggestions, getKqlQueryValues } from './utils';
import { getDocLinks } from '../../util/dependency_cache';

function getErrorWithLink(errorMessage) {
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = getDocLinks();
  return (
    <EuiText>
      {`${errorMessage} Input must be valid `}
      <EuiLink
        href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/kuery-query.html`}
        target="_blank"
      >
        {'Kibana Query Language'}
      </EuiLink>
      {' (KQL) syntax.'}
    </EuiText>
  );
}

export class KqlFilterBar extends Component {
  state = {
    error: null,
    suggestions: [],
    isLoadingSuggestions: false,
    isLoadingIndexPattern: true,
  };

  onChange = async (inputValue, selectionStart) => {
    const { indexPattern } = this.props;

    this.setState({ error: null, suggestions: [], isLoadingSuggestions: true });

    const currentRequest = uniqueId();
    this.currentRequest = currentRequest;
    const boolFilter = [];

    try {
      const suggestions =
        (await getSuggestions(inputValue, selectionStart, indexPattern, boolFilter)) || [];

      if (currentRequest !== this.currentRequest) {
        return;
      }

      this.setState({ suggestions, isLoadingSuggestions: false });
    } catch (e) {
      console.error('Error while fetching suggestions', e);
      const errorMessage = i18n.translate('xpack.ml.explorer.fetchingSuggestionsErrorMessage', {
        defaultMessage: 'Error while fetching suggestions',
      });
      this.setState({ isLoadingSuggestions: false, error: e.message ? e.message : errorMessage });
    }
  };

  onSubmit = inputValue => {
    const { indexPattern } = this.props;
    const { onSubmit } = this.props;

    try {
      // returns object with properties:  { influencersFilterQuery, filteredFields, queryString, isAndOperator }
      const kqlQueryValues = getKqlQueryValues(inputValue, indexPattern);
      onSubmit(kqlQueryValues);
    } catch (e) {
      console.log('Invalid kuery syntax', e); // eslint-disable-line no-console
      const errorWithLink = getErrorWithLink(e.message);
      const errorMessage = i18n.translate('xpack.ml.explorer.invalidKuerySyntaxErrorMessage', {
        defaultMessage: 'Invalid kuery syntax',
      });
      this.setState({ error: e.message ? errorWithLink : errorMessage });
    }
  };

  render() {
    const { error } = this.state;
    const { initialValue, placeholder, valueExternal, testSubj } = this.props;

    return (
      <Fragment>
        <FilterBar
          disabled={false}
          isLoading={this.state.isLoadingSuggestions}
          initialValue={initialValue || ''}
          onChange={this.onChange}
          placeholder={placeholder}
          onSubmit={this.onSubmit}
          suggestions={this.state.suggestions}
          valueExternal={valueExternal}
          testSubj={testSubj}
        />
        {error && <EuiCallOut color="danger">{error}</EuiCallOut>}
      </Fragment>
    );
  }
}

KqlFilterBar.propTypes = {
  indexPattern: PropTypes.object.isRequired,
  initialValue: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  valueExternal: PropTypes.string,
  testSubj: PropTypes.string,
};
