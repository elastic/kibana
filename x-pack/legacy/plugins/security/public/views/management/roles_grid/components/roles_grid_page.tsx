/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiText,
  EuiTitle,
  EuiButtonIcon,
  EuiBasicTableColumn,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import _ from 'lodash';
import React, { Component } from 'react';
import { toastNotifications } from 'ui/notify';
import { Role } from '../../../../../common/model';
import { isRoleEnabled, isReadOnlyRole, isReservedRole } from '../../../../lib/role_utils';
import { RolesApi } from '../../../../lib/roles_api';
import { ConfirmDelete } from './confirm_delete';
import { PermissionDenied } from './permission_denied';

interface Props {
  intl: InjectedIntl;
}

interface State {
  roles: Role[];
  selection: Role[];
  filter: string;
  showDeleteConfirmation: boolean;
  permissionDenied: boolean;
}

const getRoleManagementHref = (action: 'edit' | 'clone', roleName?: string) => {
  return `#/management/security/roles/${action}${roleName ? `/${roleName}` : ''}`;
};

class RolesGridPageUI extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      roles: [],
      selection: [],
      filter: '',
      showDeleteConfirmation: false,
      permissionDenied: false,
    };
  }

  public componentDidMount() {
    this.loadRoles();
  }

  public render() {
    const { permissionDenied } = this.state;

    return permissionDenied ? <PermissionDenied /> : this.getPageContent();
  }

  private getPageContent = () => {
    const { roles } = this.state;
    const { intl } = this.props;
    return (
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h1>
                <FormattedMessage
                  id="xpack.security.management.roles.roleTitle"
                  defaultMessage="Roles"
                />
              </h1>
            </EuiTitle>
            <EuiText color="subdued" size="s">
              <p>
                <FormattedMessage
                  id="xpack.security.management.roles.subtitle"
                  defaultMessage="Apply roles to groups of users and manage permissions across the stack."
                />
              </p>
            </EuiText>
          </EuiPageContentHeaderSection>
          <EuiPageContentHeaderSection>
            <EuiButton data-test-subj="createRoleButton" href={getRoleManagementHref('edit')}>
              <FormattedMessage
                id="xpack.security.management.roles.createRoleButtonLabel"
                defaultMessage="Create role"
              />
            </EuiButton>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          {this.state.showDeleteConfirmation ? (
            <ConfirmDelete
              onCancel={this.onCancelDelete}
              rolesToDelete={this.state.selection.map(role => role.name)}
              callback={this.handleDelete}
            />
          ) : null}

          {
            <EuiInMemoryTable
              itemId="name"
              responsive={false}
              columns={this.getColumnConfig(intl)}
              hasActions={true}
              selection={{
                selectable: (role: Role) => !role.metadata || !role.metadata._reserved,
                selectableMessage: (selectable: boolean) => (!selectable ? 'Role is reserved' : ''),
                onSelectionChange: (selection: Role[]) => this.setState({ selection }),
              }}
              pagination={{
                initialPageSize: 20,
                pageSizeOptions: [10, 20, 30, 50, 100],
              }}
              items={this.getVisibleRoles()}
              loading={roles.length === 0}
              search={{
                toolsLeft: this.renderToolsLeft(),
                box: {
                  incremental: true,
                },
                onChange: (query: Record<string, any>) => {
                  this.setState({
                    filter: query.queryText,
                  });
                },
              }}
              sorting={{
                sort: {
                  field: 'name',
                  direction: 'asc',
                },
              }}
              rowProps={() => {
                return {
                  'data-test-subj': 'roleRow',
                };
              }}
              isSelectable
            />
          }
        </EuiPageContentBody>
      </EuiPageContent>
    );
  };

  private getColumnConfig = (intl: InjectedIntl) => {
    const reservedRoleDesc = intl.formatMessage({
      id: 'xpack.security.management.roles.reservedColumnDescription',
      defaultMessage: 'Reserved roles are built-in and cannot be edited or removed.',
    });

    return [
      {
        field: 'name',
        name: intl.formatMessage({
          id: 'xpack.security.management.roles.nameColumnName',
          defaultMessage: 'Role',
        }),
        sortable: true,
        truncateText: true,
        render: (name: string, record: Role) => {
          return (
            <EuiText color="subdued" size="s">
              <EuiLink data-test-subj="roleRowName" href={getRoleManagementHref('edit', name)}>
                {name}
              </EuiLink>
              {!isRoleEnabled(record) && (
                <FormattedMessage
                  id="xpack.security.management.roles.disabledTooltip"
                  defaultMessage=" (disabled)"
                />
              )}
            </EuiText>
          );
        },
      },
      {
        field: 'metadata',
        name: intl.formatMessage({
          id: 'xpack.security.management.roles.reservedColumnName',
          defaultMessage: 'Reserved',
        }),
        sortable: ({ metadata }: Role) => Boolean(metadata && metadata._reserved),
        dataType: 'boolean',
        align: 'right',
        description: reservedRoleDesc,
        render: (metadata: Role['metadata']) => {
          const label = intl.formatMessage({
            id: 'xpack.security.management.roles.reservedRoleIconLabel',
            defaultMessage: 'Reserved role',
          });

          return metadata && metadata._reserved ? (
            <span title={label}>
              <EuiIcon aria-label={label} data-test-subj="reservedRole" type="check" />
            </span>
          ) : null;
        },
      },
      {
        name: intl.formatMessage({
          id: 'xpack.security.management.roles.actionsColumnName',
          defaultMessage: 'Actions',
        }),
        width: '150px',
        actions: [
          {
            available: (role: Role) => !isReadOnlyRole(role),
            render: (role: Role) => {
              const title = intl.formatMessage(
                {
                  id: 'xpack.security.management.roles.editRoleActionName',
                  defaultMessage: `Edit {roleName}`,
                },
                {
                  roleName: role.name,
                }
              );

              return (
                <EuiButtonIcon
                  aria-label={title}
                  data-test-subj={`edit-role-action-${role.name}`}
                  title={title}
                  color={'primary'}
                  iconType={'pencil'}
                  href={getRoleManagementHref('edit', role.name)}
                />
              );
            },
          },
          {
            available: (role: Role) => !isReservedRole(role),
            render: (role: Role) => {
              const title = intl.formatMessage(
                {
                  id: 'xpack.security.management.roles.cloneRoleActionName',
                  defaultMessage: `Clone {roleName}`,
                },
                {
                  roleName: role.name,
                }
              );

              return (
                <EuiButtonIcon
                  aria-label={title}
                  data-test-subj={`clone-role-action-${role.name}`}
                  title={title}
                  color={'primary'}
                  iconType={'copy'}
                  href={getRoleManagementHref('clone', role.name)}
                />
              );
            },
          },
        ],
      },
    ] as Array<EuiBasicTableColumn<Role>>;
  };

  private getVisibleRoles = () => {
    const { roles, filter } = this.state;

    return filter
      ? roles.filter(({ name }) => {
          const normalized = `${name}`.toLowerCase();
          const normalizedQuery = filter.toLowerCase();
          return normalized.indexOf(normalizedQuery) !== -1;
        })
      : roles;
  };

  private handleDelete = () => {
    this.setState({
      selection: [],
      showDeleteConfirmation: false,
    });
    this.loadRoles();
  };

  private async loadRoles() {
    try {
      const roles = await RolesApi.getRoles();

      this.setState({ roles });
    } catch (e) {
      if (_.get(e, 'body.statusCode') === 403) {
        this.setState({ permissionDenied: true });
      } else {
        toastNotifications.addDanger(
          this.props.intl.formatMessage(
            {
              id: 'xpack.security.management.roles.fetchingRolesErrorMessage',
              defaultMessage: 'Error fetching roles: {message}',
            },
            { message: _.get(e, 'body.message', '') }
          )
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
        data-test-subj="deleteRoleButton"
        color="danger"
        onClick={() => this.setState({ showDeleteConfirmation: true })}
      >
        <FormattedMessage
          id="xpack.security.management.roles.deleteSelectedRolesButtonLabel"
          defaultMessage="Delete {numSelected} role{numSelected, plural, one { } other {s}}"
          values={{
            numSelected,
          }}
        />
      </EuiButton>
    );
  }
  private onCancelDelete = () => {
    this.setState({ showDeleteConfirmation: false });
  };
}

export const RolesGridPage = injectI18n(RolesGridPageUI);
