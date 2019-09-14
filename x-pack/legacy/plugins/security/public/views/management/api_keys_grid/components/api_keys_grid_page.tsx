/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore EuiInMemoryTable typings not yet available
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
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import moment from 'moment-timezone';
import _ from 'lodash';
import React, { Fragment, Component } from 'react';
import { toastNotifications } from 'ui/notify';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SectionLoading } from '../../../../../../../../../src/plugins/es_ui_shared/public/components/section_loading';
import { ApiKey, ApiKeyCore } from '../../../../../common/model/api_key';
import { ApiKeysApi } from '../../../../lib/api_keys_api';
import { PermissionDenied } from './permission_denied';
import { ApiKeysInvalidateProvider } from './api_keys_invalidate_provider';

interface Props {
  intl: InjectedIntl;
}

interface State {
  isLoadingApp: boolean;
  isLoadingTable: boolean;
  isAdmin: boolean;
  areApiKeysEnabled: boolean;
  apiKeys: ApiKey[];
  selectedItems: ApiKey[];
  permissionDenied: boolean;
  error: any;
}

const DATE_FORMAT = 'MMMM Do YYYY';

class ApiKeysGridPageUI extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      isLoadingApp: true,
      isLoadingTable: false,
      isAdmin: false,
      areApiKeysEnabled: false,
      apiKeys: [],
      permissionDenied: false,
      selectedItems: [],
      error: undefined,
    };
  }

  public componentDidMount() {
    this.checkPrivileges();
  }

  public render() {
    const { permissionDenied, areApiKeysEnabled, isAdmin, isLoadingApp } = this.state;

    if (permissionDenied) {
      return <PermissionDenied />;
    }

    const description =
      isLoadingApp || !areApiKeysEnabled ? (
        undefined
      ) : (
        <EuiText color="subdued" size="s">
          <p>
            {isAdmin ? (
              <FormattedMessage
                id="xpack.security.management.apiKeys.table.apiKeysAllDescription"
                defaultMessage="View and revoke API keys. An API key sends requests on a user's behalf."
              />
            ) : (
              <FormattedMessage
                id="xpack.security.management.apiKeys.table.apiKeysOwnDescription"
                defaultMessage="View and revoke your API keys. An API key sends requests on your behalf."
              />
            )}
          </p>
        </EuiText>
      );

    return (
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="xpack.security.management.apiKeys.table.apiKeysTitle"
                  defaultMessage="API Keys"
                />
              </h2>
            </EuiTitle>
            {description}
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>

        <EuiPageContentBody>{this.renderContent()}</EuiPageContentBody>
      </EuiPageContent>
    );
  }

  private onApiKeysInvalidated = (apiKeysInvalidated: ApiKeyCore[]): void => {
    if (apiKeysInvalidated.length) {
      this.loadApiKeys(true);
    }
  };

  private renderContent = () => {
    const { isLoadingApp, isLoadingTable, areApiKeysEnabled, error, apiKeys } = this.state;

    if (isLoadingApp) {
      return (
        <SectionLoading>
          <FormattedMessage
            id="xpack.security.management.apiKeys.table.loadingApiKeysDescription"
            defaultMessage="Loading API keys"
          />
        </SectionLoading>
      );
    }

    if (error) {
      const {
        body: { error: errorTitle, message, statusCode },
      } = error;

      return (
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.security.management.apiKeys.table.loadingApiKeysErrorTitle"
              defaultMessage="Error loading API keys"
            />
          }
          color="danger"
          iconType="alert"
        >
          {statusCode}: {errorTitle} - {message}
        </EuiCallOut>
      );
    }

    if (!areApiKeysEnabled) {
      return (
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.security.management.apiKeys.table.apiKeysDisabledErrorTitle"
              defaultMessage="API keys not enabled in Elasticsearch"
            />
          }
          color="danger"
          iconType="alert"
        >
          <FormattedMessage
            id="xpack.security.management.apiKeys.table.apiKeysDisabledErrorDescription"
            defaultMessage="Please contact your administrator and refer to the {link} to enable API keys."
            values={{
              link: (
                <EuiLink
                  href="https://www.elastic.co/guide/en/elasticsearch/reference/current/security-settings.html#api-key-service-settings"
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.security.management.apiKeys.table.apiKeysDisabledErrorLinkText"
                    defaultMessage="docs"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiCallOut>
      );
    }

    if (!isLoadingTable && apiKeys && apiKeys.length === 0) {
      return (
        <EuiEmptyPrompt
          iconType="managementApp"
          title={
            <h1>
              <FormattedMessage
                id="xpack.security.management.apiKeys.table.emptyPromptTitle"
                defaultMessage="No API keys"
              />
            </h1>
          }
          body={
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.security.management.apiKeys.table.emptyPromptDescription"
                  defaultMessage="You can create an API key from Console."
                />
              </p>
            </Fragment>
          }
          actions={
            <EuiLink href="https://www.elastic.co/guide/en/elasticsearch/reference/current/security-api-create-api-key.html">
              <FormattedMessage
                id="xpack.security.management.apiKeys.table.emptyPromptDocsLinkMessage"
                defaultMessage="Docs"
              />
            </EuiLink>
          }
          data-test-subj="emptyPrompt"
        />
      );
    }

    return this.renderTable();
  };

  private renderTable = () => {
    const { intl } = this.props;
    const { apiKeys, selectedItems, isLoadingTable, isAdmin } = this.state;

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
      onSelectionChange: (newSelectedItems: ApiKey[]) => {
        this.setState({
          selectedItems: newSelectedItems,
        });
      },
    };

    const search = {
      toolsLeft: selectedItems.length ? (
        <ApiKeysInvalidateProvider isAdmin={isAdmin}>
          {invalidateApiKeyPrompt => {
            return (
              <EuiButton
                onClick={() =>
                  invalidateApiKeyPrompt(
                    selectedItems.map(({ name, id }) => ({ name, id })),
                    this.onApiKeysInvalidated
                  )
                }
                color="danger"
                data-test-subj="bulkInvalidateActionButton"
              >
                <FormattedMessage
                  id="xpack.security.management.apiKeys.table.invalidateApiKeyButton"
                  defaultMessage="Revoke {count, plural, one {API key} other {API keys}}"
                  values={{
                    count: selectedItems.length,
                  }}
                />
              </EuiButton>
            );
          }}
        </ApiKeysInvalidateProvider>
      ) : (
        undefined
      ),
      toolsRight: (
        <EuiButton
          color="secondary"
          iconType="refresh"
          onClick={() => this.loadApiKeys(true)}
          data-test-subj="reloadButton"
        >
          <FormattedMessage
            id="xpack.security.management.apiKeys.table.reloadApiKeysButton"
            defaultMessage="Reload"
          />
        </EuiButton>
      ),
      box: {
        incremental: true,
      },
      filters: isAdmin
        ? [
            {
              type: 'field_value_selection',
              field: 'username',
              name: i18n.translate('xpack.security.management.apiKeys.table.userFilterLabel', {
                defaultMessage: 'User',
              }),
              multiSelect: false,
              options: Object.keys(
                apiKeys.reduce((apiKeysMap: any, apiKey) => {
                  apiKeysMap[apiKey.username] = true;
                  return apiKeysMap;
                }, {})
              ).map(username => {
                return {
                  value: username,
                  view: username,
                };
              }),
            },
            {
              type: 'field_value_selection',
              field: 'realm',
              name: i18n.translate('xpack.security.management.apiKeys.table.realmFilterLabel', {
                defaultMessage: 'Realm',
              }),
              multiSelect: false,
              options: Object.keys(
                apiKeys.reduce((apiKeysMap: any, apiKey) => {
                  apiKeysMap[apiKey.realm] = true;
                  return apiKeysMap;
                }, {})
              ).map(realm => {
                return {
                  value: realm,
                  view: realm,
                };
              }),
            },
          ]
        : undefined,
    };

    return (
      <>
        {isAdmin ? (
          <>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.security.management.apiKeys.table.adminText"
                  defaultMessage="You are an API Key administrator."
                />
              }
              color="success"
              iconType="user"
              size="s"
            />

            <EuiSpacer size="m" />
          </>
        ) : (
          undefined
        )}

        {
          // @ts-ignore missing rowProps typedef
          <EuiInMemoryTable
            items={apiKeys}
            itemId="id"
            columns={this.getColumnConfig(intl)}
            search={search}
            sorting={sorting}
            selection={selection}
            pagination={pagination}
            responsive={false}
            loading={isLoadingTable}
            isSelectable={true}
            // @ts-ignore missing rowProps typedef
            rowProps={() => {
              return {
                'data-test-subj': 'apiKeyRow',
              };
            }}
          />
        }
      </>
    );
  };

  private getColumnConfig = (intl: InjectedIntl) => {
    const { isAdmin } = this.state;

    let config = [
      {
        field: 'name',
        name: intl.formatMessage({
          id: 'xpack.security.management.apiKeys.table.nameColumnName',
          defaultMessage: 'Name',
        }),
        sortable: true,
      },
    ];

    if (isAdmin) {
      config = config.concat([
        {
          field: 'username',
          name: intl.formatMessage({
            id: 'xpack.security.management.apiKeys.table.userNameColumnName',
            defaultMessage: 'User',
          }),
          sortable: true,
        },
        {
          field: 'realm',
          name: intl.formatMessage({
            id: 'xpack.security.management.apiKeys.table.realmColumnName',
            defaultMessage: 'Realm',
          }),
          sortable: true,
        },
      ]);
    }

    config = config.concat([
      {
        field: 'creation',
        name: intl.formatMessage({
          id: 'xpack.security.management.apiKeys.table.creationDateColumnName',
          defaultMessage: 'Created',
        }),
        sortable: true,
        // @ts-ignore
        render: (creationDateMs: number) => moment(creationDateMs).format(DATE_FORMAT),
      },
      {
        field: 'expiration',
        name: intl.formatMessage({
          id: 'xpack.security.management.apiKeys.table.expirationDateColumnName',
          defaultMessage: 'Expires',
        }),
        sortable: true,
        // @ts-ignore
        render: (expirationDateMs: number) => {
          if (expirationDateMs === undefined) {
            return (
              <EuiText color="subdued">
                {intl.formatMessage({
                  id: 'xpack.security.management.apiKeys.table.expirationDateNeverMessage',
                  defaultMessage: 'Never',
                })}
              </EuiText>
            );
          }

          return moment(expirationDateMs).format(DATE_FORMAT);
        },
      },
      {
        name: i18n.translate('xpack.security.management.apiKeys.table.actionsColumnName', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            render: ({ name, id }: any) => {
              return (
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem>
                    <ApiKeysInvalidateProvider isAdmin={isAdmin}>
                      {invalidateApiKeyPrompt => {
                        return (
                          <EuiToolTip
                            content={i18n.translate(
                              'xpack.security.management.apiKeys.table.actionDeleteTooltip',
                              { defaultMessage: 'Revoke' }
                            )}
                          >
                            <EuiButtonIcon
                              aria-label={i18n.translate(
                                'xpack.security.management.apiKeys.table.actionDeleteAriaLabel',
                                {
                                  defaultMessage: `Revoke '{name}'`,
                                  values: { name },
                                }
                              )}
                              iconType="minusInCircle"
                              color="danger"
                              data-test-subj="invalidateApiKeyButton"
                              onClick={() =>
                                invalidateApiKeyPrompt([{ id, name }], this.onApiKeysInvalidated)
                              }
                            />
                          </EuiToolTip>
                        );
                      }}
                    </ApiKeysInvalidateProvider>
                  </EuiFlexItem>
                </EuiFlexGroup>
              );
            },
          },
        ],
      },
    ]);

    return config;
  };

  private async checkPrivileges() {
    try {
      const { isAdmin, areApiKeysEnabled } = await ApiKeysApi.checkPrivileges();
      this.setState({ isAdmin, areApiKeysEnabled });

      if (areApiKeysEnabled) {
        this.loadApiKeys();
      } else {
        this.setState({ isLoadingApp: false });
      }
    } catch (e) {
      if (_.get(e, 'body.statusCode') === 403) {
        this.setState({ permissionDenied: true, isLoadingApp: false });
      } else {
        toastNotifications.addDanger(
          this.props.intl.formatMessage(
            {
              id: 'xpack.security.management.apiKeys.table.fetchingApiKeysErrorMessage',
              defaultMessage: 'Error checking privileges: {message}',
            },
            { message: _.get(e, 'body.message', '') }
          )
        );
      }
    }
  }

  private loadApiKeys = async (isReload = false) => {
    const { isAdmin } = this.state;

    if (isReload) {
      this.setState({ apiKeys: [], isLoadingApp: false, isLoadingTable: true });
    } else {
      this.setState({ isLoadingApp: true, isLoadingTable: false });
    }

    try {
      const { apiKeys } = await ApiKeysApi.getApiKeys(isAdmin);
      this.setState({ apiKeys });
    } catch (e) {
      this.setState({ error: e });
    }

    this.setState({ isLoadingApp: false, isLoadingTable: false });
  };
}

export const ApiKeysGridPage = injectI18n(ApiKeysGridPageUI);
