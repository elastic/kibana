/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import _ from 'lodash';
import { toastNotifications } from 'ui/notify';
import { RoleMapping } from '../../../../../../common/model';
import { RoleMappingApi } from '../../../../../lib/role_mapping_api';
import { EmptyPrompt } from './empty_prompt';
import {
  NoCompatibleRealms,
  DeleteProvider,
  PermissionDenied,
  SectionLoading,
} from '../../components';

interface State {
  isLoadingApp: boolean;
  isLoadingTable: boolean;
  roleMappings: null | RoleMapping[];
  selectedItems: RoleMapping[];
  permissionDenied: boolean;
  hasCompatibleRealms: boolean;
  error: any;
}

const path = '#/management/security/';

const getCreateRoleMappingHref = () => `${path}role_mappings/edit`;

const getEditRoleMappingHref = (roleMappingName: string) =>
  `${path}role_mappings/edit/${encodeURIComponent(roleMappingName)}`;

const getEditRoleHref = (roleName: string) => `${path}roles/edit/${encodeURIComponent(roleName)}`;

export class RoleMappingsGridPage extends Component<any, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      isLoadingApp: true,
      isLoadingTable: false,
      roleMappings: null,
      permissionDenied: false,
      hasCompatibleRealms: true,
      selectedItems: [],
      error: undefined,
    };
  }

  public componentDidMount() {
    this.checkPrivileges();
  }

  public render() {
    const { permissionDenied, isLoadingApp, isLoadingTable, error, roleMappings } = this.state;

    if (permissionDenied) {
      return <PermissionDenied />;
    }

    if (isLoadingApp) {
      return (
        <EuiPageContent>
          <SectionLoading>
            <FormattedMessage
              id="xpack.security.management.roleMappings.table.loadingRoleMappingsDescription"
              defaultMessage="Loading role mappings…"
            />
          </SectionLoading>
        </EuiPageContent>
      );
    }

    if (error) {
      const {
        body: { error: errorTitle, message, statusCode },
      } = error;

      return (
        <EuiPageContent>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.security.management.roleMappings.table.loadingRoleMappingsErrorTitle"
                defaultMessage="Error loading Role mappings"
              />
            }
            color="danger"
            iconType="alert"
          >
            {statusCode}: {errorTitle} - {message}
          </EuiCallOut>
        </EuiPageContent>
      );
    }

    if (!isLoadingTable && roleMappings && roleMappings.length === 0) {
      return (
        <EuiPageContent>
          <EmptyPrompt />
        </EuiPageContent>
      );
    }

    return (
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="xpack.security.management.roleMappings.table.roleMappingTitle"
                  defaultMessage="Role Mappings"
                />
              </h2>
            </EuiTitle>
            <EuiText color="subdued" size="s">
              <p>
                <FormattedMessage
                  id="xpack.security.management.roleMappings.table.roleMappingDescription"
                  defaultMessage="View and manage your role mappings. A role mapping is a rule-based mechanism for assigning roles to users."
                />
              </p>
            </EuiText>
          </EuiPageContentHeaderSection>
          <EuiPageContentHeaderSection>
            <EuiButton data-test-subj="createRoleMappingButton" href={getCreateRoleMappingHref()}>
              <FormattedMessage
                id="xpack.security.management.roleMappings.table.createRoleMappingButtonLabel"
                defaultMessage="Create role mapping"
              />
            </EuiButton>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          <Fragment>
            {!this.state.hasCompatibleRealms && (
              <>
                <NoCompatibleRealms />
                <EuiSpacer />
              </>
            )}
            {this.renderTable()}
          </Fragment>
        </EuiPageContentBody>
      </EuiPageContent>
    );
  }

  private renderTable = () => {
    const { roleMappings, selectedItems, isLoadingTable } = this.state;

    const message = isLoadingTable ? (
      <FormattedMessage
        id="xpack.security.management.roleMappings.table.roleMappingTableLoadingMessage"
        defaultMessage="Loading role mappings…"
      />
    ) : (
      undefined
    );

    const sorting = {
      sort: {
        field: 'name',
        direction: 'asc',
      },
    };

    const pagination = {
      initialPageSize: 20,
      pageSizeOptions: [10, 20, 50],
    };

    const selection = {
      onSelectionChange: (newSelectedItems: RoleMapping[]) => {
        this.setState({
          selectedItems: newSelectedItems,
        });
      },
    };

    const search = {
      toolsLeft: selectedItems.length ? (
        <DeleteProvider>
          {deleteRoleMappingsPrompt => {
            return (
              <EuiButton
                onClick={() => deleteRoleMappingsPrompt(selectedItems, this.onRoleMappingsDeleted)}
                color="danger"
                data-test-subj="bulkDeleteActionButton"
              >
                <FormattedMessage
                  id="xpack.security.management.roleMappings.table.deleteRoleMappingButton"
                  defaultMessage="Delete {count, plural, one {role mapping} other {role mappings}}"
                  values={{
                    count: selectedItems.length,
                  }}
                />
              </EuiButton>
            );
          }}
        </DeleteProvider>
      ) : (
        undefined
      ),
      toolsRight: (
        <EuiButton
          color="secondary"
          iconType="refresh"
          onClick={() => this.reloadRoleMappings()}
          data-test-subj="reloadButton"
        >
          <FormattedMessage
            id="xpack.security.management.roleMappings.table.reloadRoleMappingsButton"
            defaultMessage="Reload"
          />
        </EuiButton>
      ),
      box: {
        incremental: true,
      },
      filters: undefined,
    };

    return (
      <EuiInMemoryTable
        items={roleMappings}
        itemId="name"
        columns={this.getColumnConfig()}
        search={search}
        sorting={sorting}
        selection={selection}
        pagination={pagination}
        loading={isLoadingTable}
        message={message}
        isSelectable={true}
        rowProps={() => {
          return {
            'data-test-subj': 'roleMappingRow',
          };
        }}
      />
    );
  };

  private getColumnConfig = () => {
    const config = [
      {
        field: 'name',
        name: i18n.translate('xpack.security.management.roleMappings.table.nameColumnName', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        render: (roleMappingName: string) => {
          return (
            <EuiLink
              href={getEditRoleMappingHref(roleMappingName)}
              data-test-subj="roleMappingName"
            >
              {roleMappingName}
            </EuiLink>
          );
        },
      },
      {
        field: 'roles',
        name: i18n.translate('xpack.security.management.roleMappings.table.rolesColumnName', {
          defaultMessage: 'Roles',
        }),
        sortable: true,
        render: (entry: any, record: RoleMapping) => {
          const { roles = [], role_templates: roleTemplates = [] } = record;
          if (roleTemplates.length > 0) {
            return (
              <span data-test-subj="roleMappingRoles">
                {i18n.translate('xpack.security.management.roleMappings.table.roleTemplates', {
                  defaultMessage:
                    '{templateCount, plural, one{# role template} other {# role templates}} defined',
                  values: {
                    templateCount: roleTemplates.length,
                  },
                })}
              </span>
            );
          }
          const roleLinks = roles.map((rolename, index) => {
            return (
              <Fragment key={rolename}>
                <EuiLink href={getEditRoleHref(rolename)}>{rolename}</EuiLink>
                {index === roles.length - 1 ? null : ', '}
              </Fragment>
            );
          });
          return <div data-test-subj="roleMappingRoles">{roleLinks}</div>;
        },
      },
      {
        field: 'enabled',
        name: i18n.translate('xpack.security.management.roleMappings.table.enabledColumnName', {
          defaultMessage: 'Enabled',
        }),
        render: (enabled: boolean) => {
          if (enabled) {
            return (
              <EuiBadge data-test-subj="roleMappingEnabled" color="secondary">
                Enabled
              </EuiBadge>
            );
          }

          return (
            <EuiBadge color="hollow" data-test-subj="roleMappingEnabled">
              Disabled
            </EuiBadge>
          );
        },
      },
      {
        name: i18n.translate('xpack.security.management.roleMappings.table.actionsColumnName', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            render: (record: RoleMapping) => {
              return (
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.security.management.roleMappings.table.actionEditTooltip',
                    { defaultMessage: 'Edit' }
                  )}
                >
                  <EuiButtonIcon
                    aria-label={i18n.translate(
                      'xpack.security.management.roleMappings.table.actionDeleteAriaLabel',
                      {
                        defaultMessage: `Edit '{name}'`,
                        values: { name: record.name },
                      }
                    )}
                    iconType="pencil"
                    color="primary"
                    data-test-subj={`editRoleMappingButton-${record.name}`}
                    href={getEditRoleMappingHref(record.name)}
                  />
                </EuiToolTip>
              );
            },
          },
          {
            render: (record: RoleMapping) => {
              return (
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem>
                    <DeleteProvider>
                      {deleteRoleMappingPrompt => {
                        return (
                          <EuiToolTip
                            content={i18n.translate(
                              'xpack.security.management.roleMappings.table.actionDeleteTooltip',
                              { defaultMessage: 'Delete' }
                            )}
                          >
                            <EuiButtonIcon
                              aria-label={i18n.translate(
                                'xpack.security.management.roleMappings.table.actionDeleteAriaLabel',
                                {
                                  defaultMessage: `Delete '{name}'`,
                                  values: { name },
                                }
                              )}
                              iconType="trash"
                              color="danger"
                              data-test-subj={`deleteRoleMappingButton-${record.name}`}
                              onClick={() =>
                                deleteRoleMappingPrompt([record], this.onRoleMappingsDeleted)
                              }
                            />
                          </EuiToolTip>
                        );
                      }}
                    </DeleteProvider>
                  </EuiFlexItem>
                </EuiFlexGroup>
              );
            },
          },
        ],
      },
    ];
    return config;
  };

  private onRoleMappingsDeleted = (roleMappings: string[]): void => {
    if (roleMappings.length) {
      this.reloadRoleMappings();
    }
  };

  private async checkPrivileges() {
    try {
      const {
        canManageRoleMappings,
        hasCompatibleRealms,
      } = await RoleMappingApi.getRoleMappingFeatures();

      this.setState({
        permissionDenied: !canManageRoleMappings,
        hasCompatibleRealms,
      });

      if (canManageRoleMappings) {
        this.initiallyLoadRoleMappings();
      } else {
        // We're done loading and will just show the "Disabled" error.
        this.setState({ isLoadingApp: false });
      }
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate(
          'xpack.security.management.roleMappings.table.fetchingRoleMappingsErrorMessage',
          {
            defaultMessage: 'Error loading role mappings: {message}',
            values: { message: _.get(e, 'body.message', '') },
          }
        )
      );
    }
  }

  private initiallyLoadRoleMappings = () => {
    this.setState({ isLoadingApp: true, isLoadingTable: false });
    this.loadRoleMappings();
  };

  private reloadRoleMappings = () => {
    this.setState({ roleMappings: [], isLoadingApp: false, isLoadingTable: true });
    this.loadRoleMappings();
  };

  private loadRoleMappings = async () => {
    try {
      const roleMappings = await RoleMappingApi.getRoleMappings();
      this.setState({ roleMappings });
    } catch (e) {
      this.setState({ error: e });
    }

    this.setState({ isLoadingApp: false, isLoadingTable: false });
  };
}
