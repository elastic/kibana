/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { groupBy } from 'lodash';
import React, { Fragment, FunctionComponent } from 'react';

import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { DeprecationInfo } from 'src/legacy/core_plugins/elasticsearch';
import { EnrichedDeprecationInfo } from '../../../../../../../server/np_ready/lib/es_migration_apis';
import { GroupByOption, LevelFilterOption } from '../../../types';

import { DeprecationCountSummary } from './count_summary';
import { DeprecationHealth } from './health';
import { DeprecationList } from './list';

// exported only for testing
export const filterDeps = (level: LevelFilterOption, search: string = '') => {
  const conditions: Array<(dep: EnrichedDeprecationInfo) => boolean> = [];

  if (level !== LevelFilterOption.all) {
    conditions.push((dep: DeprecationInfo) => dep.level === level);
  }

  if (search.length > 0) {
    // Change everything to lower case for a case-insensitive comparison
    conditions.push(dep => {
      try {
        const searchReg = new RegExp(search.toLowerCase());
        return Boolean(
          dep.message.toLowerCase().match(searchReg) ||
            (dep.details && dep.details.toLowerCase().match(searchReg)) ||
            (dep.index && dep.index.toLowerCase().match(searchReg)) ||
            (dep.node && dep.node.toLowerCase().match(searchReg))
        );
      } catch (e) {
        // ignore any regexp errors.
        return true;
      }
    });
  }

  // Return true if every condition function returns true (boolean AND)
  return (dep: EnrichedDeprecationInfo) => conditions.map(c => c(dep)).every(t => t);
};

/**
 * A single accordion item for a grouped deprecation item.
 */
export const DeprecationAccordion: FunctionComponent<{
  id: string;
  deprecations: EnrichedDeprecationInfo[];
  title: string;
  currentGroupBy: GroupByOption;
  forceExpand: boolean;
}> = ({ id, deprecations, title, currentGroupBy, forceExpand }) => {
  const hasIndices = Boolean(
    currentGroupBy === GroupByOption.message && deprecations.filter(d => d.index).length
  );
  const numIndices = hasIndices ? deprecations.length : null;

  return (
    <EuiAccordion
      id={id}
      className="upgDeprecations__item"
      initialIsOpen={forceExpand}
      buttonContent={<span className="upgDeprecations__itemName">{title}</span>}
      extraAction={
        <div>
          {hasIndices && (
            <Fragment>
              <EuiBadge color="hollow">
                <span data-test-subj="indexCount">{numIndices}</span>{' '}
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.indicesBadgeLabel"
                  defaultMessage="{numIndices, plural, one {index} other {indices}}"
                  values={{ numIndices }}
                />
              </EuiBadge>
              &emsp;
            </Fragment>
          )}
          <DeprecationHealth
            single={currentGroupBy === GroupByOption.message}
            deprecations={deprecations}
          />
        </div>
      }
    >
      <DeprecationList deprecations={deprecations} currentGroupBy={currentGroupBy} />
    </EuiAccordion>
  );
};

interface GroupedDeprecationsProps {
  currentFilter: LevelFilterOption;
  search: string;
  currentGroupBy: GroupByOption;
  allDeprecations?: EnrichedDeprecationInfo[];
}

interface GroupedDeprecationsState {
  forceExpand: true | false | null;
  expandNumber: number;
  currentPage: number;
}

const PER_PAGE = 25;

/**
 * Collection of calculated fields based on props, extracted for reuse in
 * `render` and `getDerivedStateFromProps`.
 */
const CalcFields = {
  filteredDeprecations(props: GroupedDeprecationsProps) {
    const { allDeprecations = [], currentFilter, search } = props;
    return allDeprecations.filter(filterDeps(currentFilter, search));
  },

  groups(props: GroupedDeprecationsProps) {
    const { currentGroupBy } = props;
    return groupBy(CalcFields.filteredDeprecations(props), currentGroupBy);
  },

  numPages(props: GroupedDeprecationsProps) {
    return Math.ceil(Object.keys(CalcFields.groups(props)).length / PER_PAGE);
  },
};

/**
 * Displays groups of deprecation messages in an accordion.
 */
export class GroupedDeprecations extends React.Component<
  GroupedDeprecationsProps,
  GroupedDeprecationsState
> {
  public static getDerivedStateFromProps(
    nextProps: GroupedDeprecationsProps,
    { currentPage }: GroupedDeprecationsState
  ) {
    // If filters change and the currentPage is now bigger than the num of pages we're going to show,
    // reset the current page to 0.
    if (currentPage >= CalcFields.numPages(nextProps)) {
      return { currentPage: 0 };
    } else {
      return null;
    }
  }

  public state = {
    forceExpand: false,
    // `expandNumber` is used as workaround to force EuiAccordion to re-render by
    // incrementing this number (used as a key) when expand all or collapse all is clicked.
    expandNumber: 0,
    currentPage: 0,
  };

  public render() {
    const { currentGroupBy, allDeprecations = [] } = this.props;
    const { forceExpand, expandNumber, currentPage } = this.state;

    const filteredDeprecations = CalcFields.filteredDeprecations(this.props);
    const groups = CalcFields.groups(this.props);

    return (
      <Fragment>
        <EuiFlexGroup responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              size="s"
              onClick={() => this.setExpand(true)}
              data-test-subj="expandAll"
            >
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.controls.expandAllButtonLabel"
                defaultMessage="Expand all"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="left"
              size="s"
              onClick={() => this.setExpand(false)}
              data-test-subj="collapseAll"
            >
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.controls.collapseAllButtonLabel"
                defaultMessage="Collapse all"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <DeprecationCountSummary
              allDeprecations={allDeprecations}
              deprecations={filteredDeprecations}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        <div className="upgDeprecations">
          {Object.keys(groups)
            .sort()
            // Apply pagination
            .slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE)
            .map(groupName => [
              <DeprecationAccordion
                key={expandNumber}
                id={`depgroup-${groupName}`}
                title={groupName}
                deprecations={groups[groupName]}
                {...{ currentGroupBy, forceExpand }}
              />,
            ])}

          {/* Only show pagination if we have more than PER_PAGE. */}
          {Object.keys(groups).length > PER_PAGE && (
            <Fragment>
              <EuiSpacer />

              <EuiFlexGroup justifyContent="spaceAround">
                <EuiFlexItem grow={false}>
                  <EuiPagination
                    pageCount={CalcFields.numPages(this.props)}
                    activePage={currentPage}
                    onPageClick={this.setPage}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </Fragment>
          )}
        </div>
      </Fragment>
    );
  }

  private setExpand = (forceExpand: boolean) => {
    this.setState({ forceExpand, expandNumber: this.state.expandNumber + 1 });
  };

  private setPage = (currentPage: number) => this.setState({ currentPage });
}
