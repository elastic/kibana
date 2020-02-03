/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiLink,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiContextMenu,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTablePagination,
  EuiTableRow,
  EuiTableRowCell,
  EuiTitle,
  EuiText,
  EuiPageBody,
  EuiPageContent,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';

import { getIndexListUri } from '../../../../../../index_management/public/app/services/navigation';
import { BASE_PATH, UIM_EDIT_CLICK } from '../../../../../common/constants';
import { getPolicyPath } from '../../../../services/navigation';
import { flattenPanelTree } from '../../../../services/flatten_panel_tree';
import { trackUiMetric } from '../../../../services';
import { NoMatch } from '../no_match';
import { ConfirmDelete } from './confirm_delete';
import { AddPolicyToTemplateConfirmModal } from './add_policy_to_template_confirm_modal';

const COLUMNS = {
  name: {
    label: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.nameHeader', {
      defaultMessage: 'Name',
    }),
  },
  linkedIndices: {
    label: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.linkedIndicesHeader', {
      defaultMessage: 'Linked indices',
    }),
    width: 120,
  },
  version: {
    label: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.versionHeader', {
      defaultMessage: 'Version',
    }),
    width: 120,
  },
  modified_date: {
    label: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.modifiedDateHeader', {
      defaultMessage: 'Modified date',
    }),
    width: 200,
  },
};

export class PolicyTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedPoliciesMap: {},
      renderConfirmModal: null,
    };
  }
  componentDidMount() {
    this.props.fetchPolicies(true);
  }
  renderEmpty() {
    return (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyTable.emptyPromptTitle"
              defaultMessage="Create your first index lifecycle policy"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.policyTable.emptyPromptDescription"
                defaultMessage=" An index lifecycle policy helps you manage your indices as they age."
              />
            </p>
          </Fragment>
        }
        actions={this.renderCreatePolicyButton()}
      />
    );
  }
  renderDeleteConfirmModal = () => {
    const { policyToDelete } = this.state;
    if (!policyToDelete) {
      return null;
    }
    return (
      <ConfirmDelete
        policyToDelete={policyToDelete}
        callback={this.handleDelete}
        onCancel={() => this.setState({ renderConfirmModal: null, policyToDelete: null })}
      />
    );
  };
  renderAddPolicyToTemplateConfirmModal = () => {
    const { policyToAddToTemplate } = this.state;
    if (!policyToAddToTemplate) {
      return null;
    }
    return (
      <AddPolicyToTemplateConfirmModal
        policy={policyToAddToTemplate}
        onCancel={() => this.setState({ renderConfirmModal: null, policyToAddToTemplate: null })}
      />
    );
  };
  handleDelete = () => {
    this.props.fetchPolicies(true);
    this.setState({ renderDeleteConfirmModal: null, policyToDelete: null });
  };
  onSort = column => {
    const { sortField, isSortAscending, policySortChanged } = this.props;
    const newIsSortAscending = sortField === column ? !isSortAscending : true;
    policySortChanged(column, newIsSortAscending);
  };

  buildHeader() {
    const { sortField, isSortAscending } = this.props;
    const headers = Object.entries(COLUMNS).map(([fieldName, { label, width }]) => {
      const isSorted = sortField === fieldName;
      return (
        <EuiTableHeaderCell
          key={fieldName}
          onSort={() => this.onSort(fieldName)}
          isSorted={isSorted}
          isSortAscending={isSortAscending}
          data-test-subj={`policyTableHeaderCell-${fieldName}`}
          className={'policyTable__header--' + fieldName}
          width={width}
        >
          {label}
        </EuiTableHeaderCell>
      );
    });
    headers.push(
      <EuiTableHeaderCell
        key="deleteHeader"
        data-test-subj="policyTableHeaderCell-delete"
        width={150}
      />
    );
    return headers;
  }

  buildRowCell(fieldName, value) {
    if (fieldName === 'name') {
      return (
        /* eslint-disable-next-line @elastic/eui/href-or-on-click */
        <EuiLink
          className="policyTable__link"
          data-test-subj="policyTablePolicyNameLink"
          href={getPolicyPath(value)}
          onClick={() => trackUiMetric('click', UIM_EDIT_CLICK)}
        >
          {value}
        </EuiLink>
      );
    } else if (fieldName === 'linkedIndices') {
      return (
        <EuiText>
          <b>{value ? value.length : '0'}</b>
        </EuiText>
      );
    } else if (fieldName === 'modified_date' && value) {
      return moment(value).format('YYYY-MM-DD HH:mm:ss');
    }
    return value;
  }
  renderCreatePolicyButton() {
    return (
      <EuiButton
        href={`#${BASE_PATH}policies/edit`}
        fill
        iconType="plusInCircle"
        data-test-subj="createPolicyButton"
      >
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.policyTable.emptyPrompt.createButtonLabel"
          defaultMessage="Create policy"
        />
      </EuiButton>
    );
  }
  renderConfirmModal() {
    const { renderConfirmModal } = this.state;
    if (renderConfirmModal) {
      return renderConfirmModal();
    } else {
      return null;
    }
  }
  buildActionPanelTree(policy) {
    const hasLinkedIndices = Boolean(policy.linkedIndices && policy.linkedIndices.length);

    const viewIndicesLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.policyTable.viewIndicesButtonText',
      {
        defaultMessage: 'View indices linked to policy',
      }
    );
    const addPolicyToTemplateLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.policyTable.addPolicyToTemplateButtonText',
      {
        defaultMessage: 'Add policy to index template',
      }
    );
    const deletePolicyLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.policyTable.deletePolicyButtonText',
      {
        defaultMessage: 'Delete policy',
      }
    );
    const deletePolicyTooltip = hasLinkedIndices
      ? i18n.translate('xpack.indexLifecycleMgmt.policyTable.deletePolicyButtonDisabledTooltip', {
          defaultMessage: 'You cannot delete a policy that is being used by an index',
        })
      : null;
    const items = [];
    if (hasLinkedIndices) {
      items.push({
        name: viewIndicesLabel,
        icon: 'list',
        onClick: () => {
          window.location.hash = getIndexListUri(`ilm.policy:${policy.name}`);
        },
      });
    }
    items.push({
      name: addPolicyToTemplateLabel,
      icon: 'plusInCircle',
      onClick: () =>
        this.setState({
          renderConfirmModal: this.renderAddPolicyToTemplateConfirmModal,
          policyToAddToTemplate: policy,
        }),
    });
    items.push({
      name: deletePolicyLabel,
      disabled: hasLinkedIndices,
      icon: 'trash',
      toolTipContent: deletePolicyTooltip,
      onClick: () =>
        this.setState({
          renderConfirmModal: this.renderDeleteConfirmModal,
          policyToDelete: policy,
        }),
    });
    const panelTree = {
      id: 0,
      title: i18n.translate('xpack.indexLifecycleMgmt.policyTable.policyActionsMenu.panelTitle', {
        defaultMessage: 'Policy options',
      }),
      items,
    };
    return flattenPanelTree(panelTree);
  }
  togglePolicyPopover = policy => {
    if (this.isPolicyPopoverOpen(policy)) {
      this.closePolicyPopover(policy);
    } else {
      this.openPolicyPopover(policy);
    }
  };
  isPolicyPopoverOpen = policy => {
    return this.state.policyPopover === policy.name;
  };
  closePolicyPopover = policy => {
    if (this.isPolicyPopoverOpen(policy)) {
      this.setState({ policyPopover: null });
    }
  };
  openPolicyPopover = policy => {
    this.setState({ policyPopover: policy.name });
  };
  buildRowCells(policy) {
    const { name } = policy;
    const cells = Object.entries(COLUMNS).map(([fieldName, { width }]) => {
      const value = policy[fieldName];

      if (fieldName === 'name') {
        return (
          <th
            key={`${fieldName}-${name}`}
            className="euiTableRowCell"
            scope="row"
            data-test-subj={`policyTableCell-${fieldName}`}
          >
            <div className={`euiTableCellContent policyTable__content--${fieldName}`}>
              {this.buildRowCell(fieldName, value)}
            </div>
          </th>
        );
      }

      return (
        <EuiTableRowCell
          key={`${fieldName}-${name}`}
          truncateText={false}
          data-test-subj={`policyTableCell-${fieldName}`}
          className={'policyTable__content--' + fieldName}
          width={width}
        >
          {this.buildRowCell(fieldName, value)}
        </EuiTableRowCell>
      );
    });
    const button = (
      <EuiButtonEmpty
        data-test-subj="policyActionsContextMenuButton"
        onClick={() => this.togglePolicyPopover(policy)}
        color="primary"
      >
        {i18n.translate('xpack.indexLifecycleMgmt.policyTable.actionsButtonText', {
          defaultMessage: 'Actions',
        })}
      </EuiButtonEmpty>
    );
    cells.push(
      <EuiTableRowCell
        align={RIGHT_ALIGNMENT}
        key={`delete-${name}`}
        truncateText={false}
        data-test-subj={`policyTableCell-actions-${name}`}
        style={{ width: 150 }}
      >
        <EuiPopover
          id="contextMenuPolicy"
          button={button}
          isOpen={this.isPolicyPopoverOpen(policy)}
          closePopover={() => this.closePolicyPopover(policy)}
          panelPaddingSize="none"
          withTitle
          anchorPosition="rightUp"
          repositionOnScroll
        >
          <EuiContextMenu initialPanelId={0} panels={this.buildActionPanelTree(policy)} />
        </EuiPopover>
      </EuiTableRowCell>
    );
    return cells;
  }

  buildRows() {
    const { policies = [] } = this.props;
    return policies.map(policy => {
      const { name } = policy;
      return <EuiTableRow key={`${name}-row`}>{this.buildRowCells(policy)}</EuiTableRow>;
    });
  }

  renderPager() {
    const { pager, policyPageChanged, policyPageSizeChanged } = this.props;
    return (
      <EuiTablePagination
        activePage={pager.getCurrentPageIndex()}
        itemsPerPage={pager.itemsPerPage}
        itemsPerPageOptions={[10, 50, 100]}
        pageCount={pager.getTotalPages()}
        onChangeItemsPerPage={policyPageSizeChanged}
        onChangePage={policyPageChanged}
      />
    );
  }

  onItemSelectionChanged = selectedPolicies => {
    this.setState({ selectedPolicies });
  };

  render() {
    const {
      totalNumberOfPolicies,
      policyFilterChanged,
      filter,
      policyListLoaded,
      policies,
    } = this.props;
    const { selectedPoliciesMap } = this.state;
    const numSelected = Object.keys(selectedPoliciesMap).length;
    let content;
    let tableContent;
    if (totalNumberOfPolicies || !policyListLoaded) {
      if (!policyListLoaded) {
        tableContent = <EuiLoadingSpinner size="m" />;
      } else if (totalNumberOfPolicies > 0) {
        tableContent = (
          <EuiTable className="policyTable__horizontalScroll">
            <EuiScreenReaderOnly>
              <caption role="status" aria-relevant="text" aria-live="polite">
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.policyTable.captionText"
                  defaultMessage="Below is the index lifecycle policy table
                    containing {count, plural, one {# row} other {# rows}} out of {total}."
                  values={{ count: policies.length, total: totalNumberOfPolicies }}
                />
              </caption>
            </EuiScreenReaderOnly>
            <EuiTableHeader>{this.buildHeader()}</EuiTableHeader>
            <EuiTableBody>{this.buildRows()}</EuiTableBody>
          </EuiTable>
        );
      } else {
        tableContent = <NoMatch />;
      }
      content = (
        <Fragment>
          <EuiFlexGroup gutterSize="l" alignItems="center">
            {numSelected > 0 ? (
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="deletePolicyButton"
                  color="danger"
                  onClick={() => this.setState({ showDeleteConfirmation: true })}
                >
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.policyTable.deletedPoliciesText"
                    defaultMessage="Deleted {numSelected} {numSelected, plural, one {policy} other {policies}}"
                    values={{ numSelected }}
                  />
                </EuiButton>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem>
              <EuiFieldSearch
                fullWidth
                value={filter}
                onChange={event => {
                  policyFilterChanged(event.target.value);
                }}
                data-test-subj="policyTableFilterInput"
                placeholder={i18n.translate(
                  'xpack.indexLifecycleMgmt.policyTable.systempoliciesSearchInputPlaceholder',
                  {
                    defaultMessage: 'Search',
                  }
                )}
                aria-label={i18n.translate(
                  'xpack.indexLifecycleMgmt.policyTable.systempoliciesSearchInputAriaLabel',
                  {
                    defaultMessage: 'Search policies',
                  }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          {tableContent}
        </Fragment>
      );
    } else {
      content = this.renderEmpty();
    }

    return (
      <EuiPageBody>
        <EuiPageContent verticalPosition="center" horizontalPosition="center">
          <div>
            {this.renderConfirmModal()}
            {totalNumberOfPolicies || !policyListLoaded ? (
              <Fragment>
                <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="l">
                      <h1 data-test-subj="sectionHeading">
                        <FormattedMessage
                          id="xpack.indexLifecycleMgmt.policyTable.sectionHeading"
                          defaultMessage="Index Lifecycle Policies"
                        />
                      </h1>
                    </EuiTitle>
                  </EuiFlexItem>
                  {totalNumberOfPolicies ? (
                    <EuiFlexItem grow={false}>{this.renderCreatePolicyButton()}</EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.indexLifecycleMgmt.policyTable.sectionDescription"
                      defaultMessage="Manage your indices as they age.  Attach a policy to automate
                        when and how to transition an index through its lifecycle."
                    />
                  </p>
                </EuiText>
              </Fragment>
            ) : null}
            <EuiSpacer />
            {content}
            <EuiSpacer size="m" />
            {totalNumberOfPolicies && totalNumberOfPolicies > 10 ? this.renderPager() : null}
          </div>
        </EuiPageContent>
      </EuiPageBody>
    );
  }
}
