/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination, EuiBasicTableColumn, EuiSwitchEvent } from '@elastic/eui';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiPageHeader,
  EuiPageSection,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import React, { Component } from 'react';

import type { ApplicationStart, NotificationsStart, ScopedHistory } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type { Role, User } from '../../../../common';
import { DeprecatedBadge, DisabledBadge, ReservedBadge } from '../../badges';
import { RoleTableDisplay } from '../../role_table_display';
import type { RolesAPIClient } from '../../roles';
import { ConfirmDeleteUsers } from '../components';
import type { UserAPIClient } from '../user_api_client';
import { getExtendedUserDeprecationNotice, isUserDeprecated, isUserReserved } from '../user_utils';

interface Props {
  userAPIClient: PublicMethodsOf<UserAPIClient>;
  rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
  notifications: NotificationsStart;
  history: ScopedHistory;
  navigateToApp: ApplicationStart['navigateToApp'];
  readOnly?: boolean;
}

interface State {
  users: User[];
  visibleUsers: User[];
  roles: null | Role[];
  selection: User[];
  showDeleteConfirmation: boolean;
  permissionDenied: boolean;
  filter: string;
  includeReservedUsers: boolean;
  isTableLoading: boolean;
  pageIndex: number;
  pageSize: number;
}

export class UsersGridPage extends Component<Props, State> {
  static defaultProps: Partial<Props> = {
    readOnly: false,
  };

  private static readonly PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
  private static readonly DEFAULT_PAGE_SIZE = 20;

  constructor(props: Props) {
    super(props);

    const params = new URLSearchParams(props.history.location.search);
    const pageIndex = parseInt(params.get('page') ?? '', 10);
    const pageSize = parseInt(params.get('perPage') ?? '', 10);
    const filter = params.get('q') ?? '';
    const includeReservedUsers = params.get('includeReserved') !== 'false';

    this.state = {
      users: [],
      visibleUsers: [],
      roles: [],
      selection: [],
      showDeleteConfirmation: false,
      permissionDenied: false,
      filter,
      includeReservedUsers,
      isTableLoading: false,
      pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : 0,
      pageSize:
        Number.isFinite(pageSize) &&
        (UsersGridPage.PAGE_SIZE_OPTIONS as readonly number[]).includes(pageSize)
          ? pageSize
          : UsersGridPage.DEFAULT_PAGE_SIZE,
    };
  }

  public componentDidMount() {
    this.loadUsersAndRoles();
  }

  public render() {
    const { roles, permissionDenied, showDeleteConfirmation, selection } = this.state;

    if (permissionDenied) {
      return (
        <EuiFlexGroup gutterSize="none">
          <EuiPageSection alignment="center" color="danger">
            <EuiEmptyPrompt
              iconType="securityApp"
              title={
                <h1>
                  <FormattedMessage
                    id="xpack.security.management.users.deniedPermissionTitle"
                    defaultMessage="You need permission to manage users"
                  />
                </h1>
              }
              body={
                <p data-test-subj="permissionDeniedMessage">
                  <FormattedMessage
                    id="xpack.security.management.users.permissionDeniedToManageUsersDescription"
                    defaultMessage="Contact your system administrator."
                  />
                </p>
              }
            />
          </EuiPageSection>
        </EuiFlexGroup>
      );
    }
    const columns: Array<EuiBasicTableColumn<User>> = [
      {
        field: 'username',
        name: i18n.translate('xpack.security.management.users.userNameColumnName', {
          defaultMessage: 'User Name',
        }),
        sortable: true,
        render: (username: string) => (
          <EuiLink
            data-test-subj="userRowUserName"
            {...reactRouterNavigate(this.props.history, `/edit/${encodeURIComponent(username)}`)}
          >
            {username}
          </EuiLink>
        ),
      },
      {
        field: 'full_name',
        name: i18n.translate('xpack.security.management.users.fullNameColumnName', {
          defaultMessage: 'Full Name',
        }),
        sortable: true,
        truncateText: true,
        render: (fullName: string) => {
          return <div data-test-subj="userRowFullName">{fullName}</div>;
        },
      },

      {
        field: 'email',
        name: i18n.translate('xpack.security.management.users.emailAddressColumnName', {
          defaultMessage: 'Email Address',
        }),
        sortable: true,
        truncateText: true,
        render: (email: string) => {
          return <div data-test-subj="userRowEmail">{email}</div>;
        },
      },
      {
        field: 'roles',
        name: i18n.translate('xpack.security.management.users.rolesColumnName', {
          defaultMessage: 'Roles',
        }),
        width: '30%',
        render: (rolenames: string[]) => {
          const roleLinks = rolenames.map((rolename, index) => {
            const roleDefinition = roles?.find((role) => role.name === rolename) ?? rolename;
            return (
              <EuiFlexItem grow={false} key={rolename}>
                <RoleTableDisplay role={roleDefinition} navigateToApp={this.props.navigateToApp} />
              </EuiFlexItem>
            );
          });
          return (
            <EuiFlexGroup data-test-subj="userRowRoles" gutterSize="s" wrap>
              {roleLinks}
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'metadata',
        name: i18n.translate('xpack.security.management.users.statusColumnName', {
          defaultMessage: 'Status',
        }),
        width: '10%',
        sortable: ({ metadata }: User) => Boolean(metadata && metadata._reserved),
        description: i18n.translate('xpack.security.management.users.reservedColumnDescription', {
          defaultMessage:
            'Reserved users are built-in and cannot be removed. Only the password can be changed.',
        }),
        render: (metadata: User['metadata'], record: User) => this.getUserStatusBadges(record),
      },
    ];
    const pagination = {
      pageIndex: this.state.pageIndex,
      pageSize: this.state.pageSize,
      pageSizeOptions: [...UsersGridPage.PAGE_SIZE_OPTIONS],
    };

    const selectionConfig = {
      itemId: 'username',
      selectable: (user: User) => !(user.metadata && user.metadata._reserved),
      selectableMessage: (selectable: boolean) => (!selectable ? 'User is a system user' : ''),
      onSelectionChange: (updatedSelection: User[]) =>
        this.setState({ selection: updatedSelection }),
    };
    const search = {
      toolsLeft: this.renderToolsLeft(),
      toolsRight: this.renderToolsRight(),
      defaultQuery: this.state.filter,
      box: {
        incremental: true,
        'data-test-subj': 'searchUsers',
      },
      onChange: (query: any) => {
        this.setState(
          {
            filter: query.queryText,
            pageIndex: 0,
            visibleUsers: this.getVisibleUsers(
              this.state.users,
              query.queryText,
              this.state.includeReservedUsers
            ),
          },
          () => this.updateUrlParams()
        );
      },
    };
    const sorting = {
      sort: {
        field: 'username',
        direction: 'asc',
      },
    } as const;
    const rowProps = () => {
      return {
        'data-test-subj': 'userRow',
      };
    };

    return (
      <>
        <EuiPageHeader
          bottomBorder
          pageTitle={
            <FormattedMessage
              id="xpack.security.management.users.usersTitle"
              defaultMessage="Users"
            />
          }
          data-test-subj="securityUsersPageHeader"
          rightSideItems={
            this.props.readOnly
              ? undefined
              : [
                  <EuiButton
                    data-test-subj="createUserButton"
                    {...reactRouterNavigate(this.props.history, `/create`)}
                    fill
                    iconType="plusInCircleFilled"
                  >
                    <FormattedMessage
                      id="xpack.security.management.users.createNewUserButtonLabel"
                      defaultMessage="Create user"
                    />
                  </EuiButton>,
                ]
          }
        />

        <EuiSpacer size="l" />

        {showDeleteConfirmation ? (
          <ConfirmDeleteUsers
            onCancel={this.onCancelDelete}
            usersToDelete={selection.map((user) => user.username)}
            callback={this.handleDelete}
            userAPIClient={this.props.userAPIClient}
            notifications={this.props.notifications}
          />
        ) : null}

        {
          <EuiInMemoryTable
            itemId="username"
            tableCaption={i18n.translate('xpack.security.management.users.tableCaption', {
              defaultMessage: 'Users',
            })}
            rowHeader="username"
            columns={columns}
            selection={this.props.readOnly ? undefined : selectionConfig}
            pagination={pagination}
            items={this.state.visibleUsers}
            loading={this.state.isTableLoading}
            search={search}
            sorting={sorting}
            onTableChange={this.onTableChange}
            rowProps={rowProps}
          />
        }
      </>
    );
  }

  private handleDelete = (usernames: string[], errors: string[]) => {
    const { users } = this.state;
    const filteredUsers = users.filter(({ username }) => {
      return !usernames.includes(username) || errors.includes(username);
    });
    this.setState({
      selection: [],
      showDeleteConfirmation: false,
      users: filteredUsers,
      visibleUsers: this.getVisibleUsers(
        filteredUsers,
        this.state.filter,
        this.state.includeReservedUsers
      ),
    });
  };

  private getVisibleUsers = (users: User[], filter: string, includeReservedUsers: boolean) => {
    return users.filter(
      ({ username, roles: userRoles, full_name: fullName = '', email = '', metadata = {} }) => {
        const normalized = `${username} ${userRoles.join(' ')} ${fullName} ${email}`.toLowerCase();
        const normalizedQuery = filter.toLowerCase();
        return (
          normalized.indexOf(normalizedQuery) !== -1 &&
          (includeReservedUsers || !metadata._reserved)
        );
      }
    );
  };

  private async loadUsersAndRoles() {
    try {
      this.setState({
        isTableLoading: true,
      });
      const [users, roles] = await Promise.all([
        this.props.userAPIClient.getUsers(),
        this.props.rolesAPIClient.getRoles(),
      ]);
      this.setState({
        isTableLoading: false,
        users,
        roles,
        visibleUsers: this.getVisibleUsers(
          users,
          this.state.filter,
          this.state.includeReservedUsers
        ),
      });
    } catch (e) {
      this.setState({ permissionDenied: e.body.statusCode === 403, isTableLoading: false });
      if (e.body.statusCode !== 403) {
        this.props.notifications.toasts.addDanger(
          i18n.translate('xpack.security.management.users.fetchingUsersErrorMessage', {
            defaultMessage: 'Error fetching users: {message}',
            values: { message: e.body.message },
          })
        );
      }
    }
  }

  private renderToolsLeft() {
    const { selection } = this.state;
    if (selection.length === 0) {
      return;
    }
    const numSelected = selection.length;
    return (
      <EuiButton
        data-test-subj="deleteUserButton"
        color="danger"
        onClick={() => this.setState({ showDeleteConfirmation: true })}
      >
        <FormattedMessage
          id="xpack.security.management.users.deleteUsersButtonLabel"
          defaultMessage="Delete {numSelected} user{numSelected, plural, one { } other {s}}"
          values={{
            numSelected,
          }}
        />
      </EuiButton>
    );
  }

  private onIncludeReservedUsersChange = (e: EuiSwitchEvent) => {
    this.setState(
      {
        includeReservedUsers: e.target.checked,
        pageIndex: 0,
        visibleUsers: this.getVisibleUsers(this.state.users, this.state.filter, e.target.checked),
      },
      () => this.updateUrlParams()
    );
  };

  private renderToolsRight() {
    return (
      <EuiSwitch
        data-test-subj="showReservedUsersSwitch"
        label={
          <FormattedMessage
            id="xpack.security.management.users.showReservedUsersLabel"
            defaultMessage="Show reserved users"
          />
        }
        checked={this.state.includeReservedUsers}
        onChange={this.onIncludeReservedUsersChange}
      />
    );
  }

  private getUserStatusBadges = (user: User) => {
    const enabled = user.enabled;
    const reserved = isUserReserved(user);
    const deprecated = isUserDeprecated(user);

    const badges = [];
    if (!enabled) {
      badges.push(<DisabledBadge data-test-subj="userDisabled" />);
    }
    if (reserved) {
      badges.push(
        <ReservedBadge
          data-test-subj="userReserved"
          tooltipContent={
            <FormattedMessage
              id="xpack.security.management.users.reservedUserBadgeTooltip"
              defaultMessage="Reserved users are built-in and cannot be edited or removed."
            />
          }
        />
      );
    }
    if (deprecated) {
      badges.push(
        <DeprecatedBadge
          data-test-subj="userDeprecated"
          tooltipContent={getExtendedUserDeprecationNotice(user)}
        />
      );
    }

    return (
      <EuiFlexGroup gutterSize="s" wrap>
        {badges.map((badge, index) => (
          <EuiFlexItem key={index} grow={false}>
            {badge}
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  };

  private updateUrlParams = () => {
    const { pageIndex, pageSize, filter, includeReservedUsers } = this.state;
    const params = new URLSearchParams();

    if (pageIndex > 0) {
      params.set('page', String(pageIndex));
    }
    if (pageSize !== UsersGridPage.DEFAULT_PAGE_SIZE) {
      params.set('perPage', String(pageSize));
    }
    if (filter) {
      params.set('q', filter);
    }
    if (!includeReservedUsers) {
      params.set('includeReserved', 'false');
    }

    const search = params.toString();
    if (search !== this.props.history.location.search.replace(/^\?/, '')) {
      this.props.history.replace({ search });
    }
  };

  private onTableChange = ({ page }: CriteriaWithPagination<User>) => {
    if (page) {
      const { index: pageIndex, size: pageSize } = page;
      this.setState({ pageIndex, pageSize }, () => this.updateUrlParams());
    }
  };

  private onCancelDelete = () => {
    this.setState({ showDeleteConfirmation: false });
  };
}
