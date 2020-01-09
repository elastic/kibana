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
import { RoleMapping } from '../../../../../../common/model';
import { RoleMappingsAPI } from '../../../../../lib/role_mappings_api';
import { EmptyPrompt } from './empty_prompt';
import {
  NoCompatibleRealms,
  DeleteProvider,
  PermissionDenied,
  SectionLoading,
} from '../../components';
import { documentationLinks } from '../../services/documentation_links';
import {
  getCreateRoleMappingHref,
  getEditRoleMappingHref,
  getEditRoleHref,
} from '../../../management_urls';

interface Props {
  roleMappingsAPI: RoleMappingsAPI;
}

interface State {
  loadState: 'loadingApp' | 'loadingTable' | 'permissionDenied' | 'finished';
  roleMappings: null | RoleMapping[];
  selectedItems: RoleMapping[];
  hasCompatibleRealms: boolean;
  error: any;
}

export class RoleMappingsGridPage extends Component<Props, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      loadState: 'loadingApp',
      roleMappings: null,
      hasCompatibleRealms: true,
      selectedItems: [],
      error: undefined,
    };
  }

  public componentDidMount() {
    this.checkPrivileges();
  }

  public render() {
    const { loadState, error, roleMappings } = this.state;

    if (loadState === 'permissionDenied') {
      return <PermissionDenied />;
    }

    if (loadState === 'loadingApp') {
      return (
        <EuiPageContent>
          <SectionLoading>
            <FormattedMessage
              id="xpack.security.management.roleMappings.loadingRoleMappingsDescription"
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
                id="xpack.security.management.roleMappings.loadingRoleMappingsErrorTitle"
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

    if (loadState === 'finished' && roleMappings && roleMappings.length === 0) {
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
                  id="xpack.security.management.roleMappings.roleMappingTitle"
                  defaultMessage="Role Mappings"
                />
              </h2>
            </EuiTitle>
            <EuiText color="subdued" size="s">
              <p>
                <FormattedMessage
                  id="xpack.security.management.roleMappings.roleMappingDescription"
                  defaultMessage="Role mappings define which roles are assigned to users from an external identity provider. {learnMoreLink}"
                  values={{
                    learnMoreLink: (
                      <EuiLink
                        href={documentationLinks.getRoleMappingDocUrl()}
                        external={true}
                        target="_blank"
                      >
                        <FormattedMessage
                          id="xpack.security.management.roleMappings.learnMoreLinkText"
                          defaultMessage="Learn more."
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiText>
          </EuiPageContentHeaderSection>
          <EuiPageContentHeaderSection>
            <EuiButton data-test-subj="createRoleMappingButton" href={getCreateRoleMappingHref()}>
              <FormattedMessage
                id="xpack.security.management.roleMappings.createRoleMappingButtonLabel"
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
    const { roleMappings, selectedItems, loadState } = this.state;

    const message =
      loadState === 'loadingTable' ? (
        <FormattedMessage
          id="xpack.security.management.roleMappings.roleMappingTableLoadingMessage"
          defaultMessage="Loading role mappings…"
        />
      ) : (
        undefined
      );

    const sorting = {
      sort: {
        field: 'name',
        direction: 'asc' as any,
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
        <DeleteProvider roleMappingsAPI={this.props.roleMappingsAPI}>
          {deleteRoleMappingsPrompt => {
            return (
              <EuiButton
                onClick={() => deleteRoleMappingsPrompt(selectedItems, this.onRoleMappingsDeleted)}
                color="danger"
                data-test-subj="bulkDeleteActionButton"
              >
                <FormattedMessage
                  id="xpack.security.management.roleMappings.deleteRoleMappingButton"
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
            id="xpack.security.management.roleMappings.reloadRoleMappingsButton"
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
        items={roleMappings!}
        itemId="name"
        columns={this.getColumnConfig()}
        search={search}
        sorting={sorting}
        selection={selection}
        pagination={pagination}
        loading={loadState === 'loadingTable'}
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
        name: i18n.translate('xpack.security.management.roleMappings.nameColumnName', {
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
        name: i18n.translate('xpack.security.management.roleMappings.rolesColumnName', {
          defaultMessage: 'Roles',
        }),
        sortable: true,
        render: (entry: any, record: RoleMapping) => {
          const { roles = [], role_templates: roleTemplates = [] } = record;
          if (roleTemplates.length > 0) {
            return (
              <span data-test-subj="roleMappingRoles">
                {i18n.translate('xpack.security.management.roleMappings.roleTemplates', {
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
        name: i18n.translate('xpack.security.management.roleMappings.enabledColumnName', {
          defaultMessage: 'Enabled',
        }),
        sortable: true,
        render: (enabled: boolean) => {
          if (enabled) {
            return (
              <EuiBadge data-test-subj="roleMappingEnabled" color="secondary">
                <FormattedMessage
                  id="xpack.security.management.roleMappings.enabledBadge"
                  defaultMessage="Enabled"
                />
              </EuiBadge>
            );
          }

          return (
            <EuiBadge color="hollow" data-test-subj="roleMappingEnabled">
              <FormattedMessage
                id="xpack.security.management.roleMappings.disabledBadge"
                defaultMessage="Disabled"
              />
            </EuiBadge>
          );
        },
      },
      {
        name: i18n.translate('xpack.security.management.roleMappings.actionsColumnName', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            render: (record: RoleMapping) => {
              return (
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.security.management.roleMappings.actionEditTooltip',
                    { defaultMessage: 'Edit' }
                  )}
                >
                  <EuiButtonIcon
                    aria-label={i18n.translate(
                      'xpack.security.management.roleMappings.actionEditAriaLabel',
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
                    <DeleteProvider roleMappingsAPI={this.props.roleMappingsAPI}>
                      {deleteRoleMappingPrompt => {
                        return (
                          <EuiToolTip
                            content={i18n.translate(
                              'xpack.security.management.roleMappings.actionDeleteTooltip',
                              { defaultMessage: 'Delete' }
                            )}
                          >
                            <EuiButtonIcon
                              aria-label={i18n.translate(
                                'xpack.security.management.roleMappings.actionDeleteAriaLabel',
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
      } = await this.props.roleMappingsAPI.checkRoleMappingFeatures();

      this.setState({
        loadState: canManageRoleMappings ? this.state.loadState : 'permissionDenied',
        hasCompatibleRealms,
      });

      if (canManageRoleMappings) {
        this.loadRoleMappings();
      }
    } catch (e) {
      this.setState({ error: e, loadState: 'finished' });
    }
  }

  private reloadRoleMappings = () => {
    this.setState({ roleMappings: [], loadState: 'loadingTable' });
    this.loadRoleMappings();
  };

  private loadRoleMappings = async () => {
    try {
      const roleMappings = await this.props.roleMappingsAPI.getRoleMappings();
      this.setState({ roleMappings });
    } catch (e) {
      this.setState({ error: e });
    }

    this.setState({ loadState: 'finished' });
  };
}
