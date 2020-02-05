/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { Component, Fragment } from 'react';

import { ml } from '../../../../services/ml_api_service';
import { JobGroup } from '../job_group';
import { getSelectedJobIdFromUrl, clearSelectedJobIdFromUrl } from '../utils';

import { EuiSearchBar, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

function loadGroups() {
  return ml.jobs
    .groups()
    .then(groups => {
      return groups.map(g => ({
        value: g.id,
        view: (
          <div className="group-item">
            <JobGroup name={g.id} />
            &nbsp;
            <span>
              <FormattedMessage
                id="xpack.ml.jobsList.jobFilterBar.jobGroupTitle"
                defaultMessage="({jobsCount, plural, one {# job} other {# jobs}})"
                values={{ jobsCount: g.jobIds.length }}
              />
            </span>
          </div>
        ),
      }));
    })
    .catch(error => {
      console.log(error);
      return [];
    });
}

class JobFilterBarUI extends Component {
  constructor(props) {
    super(props);

    this.state = { error: null };
    this.setFilters = props.setFilters;
  }

  urlFilterIdCleared = false;

  componentDidMount() {
    // If job id is selected in url, filter table to that id
    const selectedId = getSelectedJobIdFromUrl(window.location.href);
    if (selectedId !== undefined) {
      this.setState(
        {
          selectedId,
        },
        () => {
          // trigger onChange with query for job id to trigger table filter
          const query = EuiSearchBar.Query.parse(selectedId);
          this.onChange({ query });
        }
      );
    }
  }

  onChange = ({ query, error }) => {
    if (error) {
      this.setState({ error });
    } else {
      if (query.text === '' && this.urlFilterIdCleared === false) {
        this.urlFilterIdCleared = true;
        clearSelectedJobIdFromUrl(window.location.href);
      }
      let clauses = [];
      if (query && query.ast !== undefined && query.ast.clauses !== undefined) {
        clauses = query.ast.clauses;
      }
      this.setFilters(clauses);
      this.setState({ error: null });
    }
  };

  render() {
    const { intl } = this.props;
    const { error, selectedId } = this.state;
    const filters = [
      {
        type: 'field_value_toggle_group',
        field: 'job_state',
        items: [
          {
            value: 'opened',
            name: intl.formatMessage({
              id: 'xpack.ml.jobsList.jobFilterBar.openedLabel',
              defaultMessage: 'Opened',
            }),
          },
          {
            value: 'closed',
            name: intl.formatMessage({
              id: 'xpack.ml.jobsList.jobFilterBar.closedLabel',
              defaultMessage: 'Closed',
            }),
          },
          {
            value: 'failed',
            name: intl.formatMessage({
              id: 'xpack.ml.jobsList.jobFilterBar.failedLabel',
              defaultMessage: 'Failed',
            }),
          },
        ],
      },
      {
        type: 'field_value_toggle_group',
        field: 'datafeed_state',
        items: [
          {
            value: 'started',
            name: intl.formatMessage({
              id: 'xpack.ml.jobsList.jobFilterBar.startedLabel',
              defaultMessage: 'Started',
            }),
          },
          {
            value: 'stopped',
            name: intl.formatMessage({
              id: 'xpack.ml.jobsList.jobFilterBar.stoppedLabel',
              defaultMessage: 'Stopped',
            }),
          },
        ],
      },
      {
        type: 'field_value_selection',
        field: 'groups',
        name: intl.formatMessage({
          id: 'xpack.ml.jobsList.jobFilterBar.groupLabel',
          defaultMessage: 'Group',
        }),
        multiSelect: 'or',
        cache: 10000,
        options: () => loadGroups(),
      },
    ];
    // if prop flag for default filter set to true
    // set defaultQuery to job id and force trigger filter with onChange - pass it the query object for the job id
    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem data-test-subj="mlJobListSearchBar" grow={false}>
          {selectedId === undefined && (
            <EuiSearchBar
              box={{
                incremental: true,
              }}
              filters={filters}
              onChange={this.onChange}
              className="mlJobFilterBar"
            />
          )}
          {selectedId !== undefined && (
            <EuiSearchBar
              box={{
                incremental: true,
              }}
              defaultQuery={selectedId}
              filters={filters}
              onChange={this.onChange}
              className="mlJobFilterBar"
            />
          )}
          <EuiFormRow
            fullWidth
            isInvalid={error !== null}
            error={getError(error)}
            style={{ maxHeight: '0px' }}
          >
            <Fragment />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
JobFilterBarUI.propTypes = {
  setFilters: PropTypes.func.isRequired,
};

function getError(error) {
  if (error) {
    return i18n.translate('xpack.ml.jobsList.jobFilterBar.invalidSearchErrorMessage', {
      defaultMessage: 'Invalid search: {errorMessage}',
      values: { errorMessage: error.message },
    });
  }

  return '';
}

export const JobFilterBar = injectI18n(JobFilterBarUI);
