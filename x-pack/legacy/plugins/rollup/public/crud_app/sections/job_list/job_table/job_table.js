/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiCheckbox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableHeaderCellCheckbox,
  EuiTablePagination,
  EuiTableRow,
  EuiTableRowCell,
  EuiTableRowCellCheckbox,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { UIM_SHOW_DETAILS_CLICK } from '../../../../../common';
import { trackUiMetric, METRIC_TYPE } from '../../../services';
import { JobActionMenu, JobStatus } from '../../components';

const COLUMNS = [
  {
    name: i18n.translate('xpack.rollupJobs.jobTable.headers.nameHeader', {
      defaultMessage: 'ID',
    }),
    fieldName: 'id',
    isSortable: true,
  },
  {
    name: i18n.translate('xpack.rollupJobs.jobTable.headers.statusHeader', {
      defaultMessage: 'Status',
    }),
    fieldName: 'status',
    isSortable: true,
    render: ({ status, rollupCron }) => {
      return (
        <EuiToolTip placement="top" content={`Cron: ${rollupCron}`}>
          <JobStatus status={status} />
        </EuiToolTip>
      );
    },
  },
  {
    name: i18n.translate('xpack.rollupJobs.jobTable.headers.indexPatternHeader', {
      defaultMessage: 'Index pattern',
    }),
    truncateText: true,
    fieldName: 'indexPattern',
    isSortable: true,
  },
  {
    name: i18n.translate('xpack.rollupJobs.jobTable.headers.rollupIndexHeader', {
      defaultMessage: 'Rollup index',
    }),
    truncateText: true,
    fieldName: 'rollupIndex',
    isSortable: true,
  },
  {
    name: i18n.translate('xpack.rollupJobs.jobTable.headers.delayHeader', {
      defaultMessage: 'Delay',
    }),
    fieldName: 'rollupDelay',
    isSortable: true,
    render: ({ rollupDelay }) => rollupDelay || 'None',
  },
  {
    name: i18n.translate('xpack.rollupJobs.jobTable.headers.intervalHeader', {
      defaultMessage: 'Interval',
    }),
    fieldName: 'dateHistogramInterval',
    isSortable: true,
  },
  {
    name: i18n.translate('xpack.rollupJobs.jobTable.headers.groupsHeader', {
      defaultMessage: 'Groups',
    }),
    fieldName: 'groups',
    isSortable: false,
    truncateText: true,
    render: job =>
      ['histogram', 'terms'].reduce((text, field) => {
        if (job[field].length) {
          return text ? `${text}, ${field}` : field.replace(/^\w/, char => char.toUpperCase());
        }
        return text;
      }, ''),
  },
  {
    name: i18n.translate('xpack.rollupJobs.jobTable.headers.metricsHeader', {
      defaultMessage: 'Metrics',
    }),
    fieldName: 'metrics',
    isSortable: false,
    truncateText: true,
    render: job => {
      const { metrics } = job;

      if (metrics.length) {
        return metrics.map(metric => metric.name).join(', ');
      }

      return '';
    },
  },
];

export class JobTableUi extends Component {
  static propTypes = {
    jobs: PropTypes.array,
    pager: PropTypes.object.isRequired,
    filter: PropTypes.string.isRequired,
    sortField: PropTypes.string.isRequired,
    isSortAscending: PropTypes.bool.isRequired,
    openDetailPanel: PropTypes.func.isRequired,
    closeDetailPanel: PropTypes.func.isRequired,
    filterChanged: PropTypes.func.isRequired,
    pageChanged: PropTypes.func.isRequired,
    pageSizeChanged: PropTypes.func.isRequired,
    sortChanged: PropTypes.func.isRequired,
  };

  static defaultProps = {
    jobs: [],
  };

  static getDerivedStateFromProps(props, state) {
    // Deselct any jobs which no longer exist, e.g. they've been deleted.
    const { idToSelectedJobMap } = state;
    const jobIds = props.jobs.map(job => job.id);
    const selectedJobIds = Object.keys(idToSelectedJobMap);
    const missingJobIds = selectedJobIds.filter(selectedJobId => {
      return !jobIds.includes(selectedJobId);
    });

    if (missingJobIds.length) {
      const newMap = { ...idToSelectedJobMap };
      missingJobIds.forEach(missingJobId => delete newMap[missingJobId]);
      return { idToSelectedJobMap: newMap };
    }

    return null;
  }

  constructor(props) {
    super(props);

    this.state = {
      idToSelectedJobMap: {},
    };
  }

  toggleAll = () => {
    const allSelected = this.areAllItemsSelected();

    if (allSelected) {
      return this.setState({ idToSelectedJobMap: {} });
    }

    const { jobs } = this.props;
    const idToSelectedJobMap = {};

    jobs.forEach(({ id }) => {
      idToSelectedJobMap[id] = true;
    });

    this.setState({ idToSelectedJobMap });
  };

  toggleItem = id => {
    this.setState(({ idToSelectedJobMap }) => {
      const newMap = { ...idToSelectedJobMap };

      if (newMap[id]) {
        delete newMap[id];
      } else {
        newMap[id] = true;
      }

      return { idToSelectedJobMap: newMap };
    });
  };

  resetSelection = () => {
    this.setState({ idToSelectedJobMap: {} });
  };

  deselectItems = itemIds => {
    this.setState(({ idToSelectedJobMap }) => {
      const newMap = { ...idToSelectedJobMap };
      itemIds.forEach(id => delete newMap[id]);
      return { idToSelectedJobMap: newMap };
    });
  };

  areAllItemsSelected = () => {
    const { jobs } = this.props;
    const indexOfUnselectedItem = jobs.findIndex(job => !this.isItemSelected(job.id));
    return indexOfUnselectedItem === -1;
  };

  isItemSelected = id => {
    return !!this.state.idToSelectedJobMap[id];
  };

  getSelectedJobs() {
    const { jobs } = this.props;
    const { idToSelectedJobMap } = this.state;
    return Object.keys(idToSelectedJobMap).map(jobId => {
      return jobs.find(job => job.id === jobId);
    });
  }

  onSort = column => {
    const { sortField, isSortAscending, sortChanged } = this.props;

    const newIsSortAscending = sortField === column ? !isSortAscending : true;
    sortChanged(column, newIsSortAscending);
  };

  buildHeader() {
    const { sortField, isSortAscending } = this.props;
    return COLUMNS.map(({ name, fieldName, isSortable }) => {
      const isSorted = sortField === fieldName;

      return (
        <EuiTableHeaderCell
          key={name}
          onSort={isSortable ? () => this.onSort(fieldName) : undefined}
          isSorted={isSorted}
          isSortAscending={isSortAscending}
          data-test-subj={`jobTableHeaderCell-${fieldName}`}
        >
          {name}
        </EuiTableHeaderCell>
      );
    });
  }

  buildRowCells(job) {
    const { openDetailPanel } = this.props;

    return COLUMNS.map(({ name, fieldName, render, truncateText }) => {
      const value = render ? render(job) : job[fieldName];
      let content;

      if (fieldName === 'id') {
        content = (
          <EuiLink
            onClick={() => {
              trackUiMetric(METRIC_TYPE.CLICK, UIM_SHOW_DETAILS_CLICK);
              openDetailPanel(job.id);
            }}
          >
            {value}
          </EuiLink>
        );
      } else {
        content = <span>{value}</span>;
      }

      return (
        <EuiTableRowCell
          key={`${job.id}-${name}`}
          data-test-subj={`jobTableCell-${fieldName}`}
          truncateText={truncateText}
        >
          {truncateText ? <EuiToolTip content={value}>{content}</EuiToolTip> : content}
        </EuiTableRowCell>
      );
    });
  }

  buildRows() {
    const { jobs } = this.props;

    return jobs.map(job => {
      const { id } = job;

      return (
        <EuiTableRow key={`${id}-row`} data-test-subj="jobTableRow">
          <EuiTableRowCellCheckbox key={`checkbox-${id}`}>
            <EuiCheckbox
              type="inList"
              id={`checkboxSelectIndex-${id}`}
              checked={this.isItemSelected(id)}
              onChange={() => {
                this.toggleItem(id);
              }}
              data-test-subj={`indexTableRowCheckbox-${id}`}
            />
          </EuiTableRowCellCheckbox>

          {this.buildRowCells(job)}
        </EuiTableRow>
      );
    });
  }

  renderPager() {
    const { pager, pageChanged, pageSizeChanged } = this.props;
    return (
      <EuiTablePagination
        activePage={pager.getCurrentPageIndex()}
        itemsPerPage={pager.itemsPerPage}
        itemsPerPageOptions={[20, 50, 100]}
        pageCount={pager.getTotalPages()}
        onChangeItemsPerPage={pageSizeChanged}
        onChangePage={pageChanged}
      />
    );
  }

  render() {
    const { filterChanged, filter, jobs, intl, closeDetailPanel } = this.props;

    const { idToSelectedJobMap } = this.state;

    const atLeastOneItemSelected = Object.keys(idToSelectedJobMap).length > 0;

    return (
      <Fragment>
        <EuiFlexGroup gutterSize="l" alignItems="center">
          {atLeastOneItemSelected ? (
            <EuiFlexItem grow={false}>
              <JobActionMenu
                jobs={this.getSelectedJobs()}
                closeDetailPanel={closeDetailPanel}
                resetSelection={this.resetSelection}
                deselectJobs={this.deselectItems}
              />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <EuiFieldSearch
              fullWidth
              value={filter}
              onChange={event => {
                filterChanged(event.target.value);
              }}
              data-test-subj="jobTableFilterInput"
              placeholder={intl.formatMessage({
                id: 'xpack.rollupJobs.jobTable.searchInputPlaceholder',
                defaultMessage: 'Search',
              })}
              aria-label="Search jobs"
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {jobs.length > 0 ? (
          <EuiTable data-test-subj="rollupJobsListTable">
            <EuiTableHeader>
              <EuiTableHeaderCellCheckbox>
                <EuiCheckbox
                  id="selectAllJobsCheckbox"
                  checked={this.areAllItemsSelected()}
                  onChange={this.toggleAll}
                  type="inList"
                />
              </EuiTableHeaderCellCheckbox>
              {this.buildHeader()}
            </EuiTableHeader>

            <EuiTableBody>{this.buildRows()}</EuiTableBody>
          </EuiTable>
        ) : (
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.rollupJobs.jobTable.noJobsMatchSearchMessage"
                defaultMessage="No rollup jobs match your search"
              />
            </p>
          </EuiText>
        )}

        <EuiSpacer size="m" />

        {jobs.length > 0 ? this.renderPager() : null}
      </Fragment>
    );
  }
}

export const JobTable = injectI18n(JobTableUi);
