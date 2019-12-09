/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiCallOut,
  EuiForm,
  EuiPageContent,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import _ from 'lodash';
import { toastNotifications } from 'ui/notify';
import { RoleMapping } from '../../../../../../common/model';
import { RoleMappingApi } from '../../../../../lib/role_mapping_api';
import { RuleEditorPanel } from './rule_editor_panel';
import {
  NoCompatibleRealms,
  PermissionDenied,
  DeleteProvider,
  SectionLoading,
} from '../../components';
import { ROLE_MAPPINGS_PATH } from '../../../management_urls';
import { validateRoleMappingForSave } from '../services/role_mapping_validation';
import { MappingInfoPanel } from './mapping_info_panel';

interface State {
  isLoadingApp: boolean;
  roleMapping: RoleMapping | null;
  permissionDenied: boolean;
  hasCompatibleRealms: boolean;
  canUseStoredScripts: boolean;
  canUseInlineScripts: boolean;
  mode: 'roles' | 'templates';
  loadError: any;
  formError: {
    isInvalid: boolean;
    error?: string;
  };
  validateForm: boolean;
  saveInProgress: boolean;
  rulesValid: boolean;
}

interface Props {
  name?: string;
}

export class EditRoleMappingPage extends Component<Props, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      isLoadingApp: true,
      roleMapping: null,
      permissionDenied: false,
      hasCompatibleRealms: true,
      canUseStoredScripts: true,
      canUseInlineScripts: true,
      mode: 'roles',
      loadError: undefined,
      saveInProgress: false,
      rulesValid: true,
      validateForm: false,
      formError: {
        isInvalid: false,
      },
    };
  }

  public componentDidMount() {
    this.loadAppData();
  }

  public render() {
    const { permissionDenied, isLoadingApp, loadError: error } = this.state;

    if (permissionDenied) {
      return <PermissionDenied />;
    }

    if (isLoadingApp) {
      return (
        <EuiPageContent>
          <SectionLoading />
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
                id="xpack.security.management.editRoleMapping.table.loadingRoleMappingErrorTitle"
                defaultMessage="Error loading Role mapping"
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

    return (
      <div>
        <EuiForm isInvalid={this.state.formError.isInvalid} error={this.state.formError.error}>
          {this.getFormTitle()}
          <EuiSpacer />
          <MappingInfoPanel
            roleMapping={this.state.roleMapping!}
            onChange={roleMapping => this.setState({ roleMapping })}
            mode={this.editingExistingRoleMapping() ? 'edit' : 'create'}
            validateForm={this.state.validateForm}
            canUseInlineScripts={this.state.canUseInlineScripts}
            canUseStoredScripts={this.state.canUseStoredScripts}
          />
          <EuiSpacer />
          <RuleEditorPanel
            onValidityChange={this.onRuleValidityChange}
            rawRules={this.state.roleMapping!.rules}
            onChange={rules =>
              this.setState({
                roleMapping: {
                  ...this.state.roleMapping!,
                  rules,
                },
              })
            }
          />
          <EuiSpacer />
          {this.getFormButtons()}
        </EuiForm>
      </div>
    );
  }

  private getFormTitle = () => {
    return (
      <Fragment>
        <EuiTitle size="l">
          <h1>
            {this.editingExistingRoleMapping() ? (
              <FormattedMessage
                id="xpack.security.management.editRoleMapping.editRoleMappingTitle"
                defaultMessage="Edit role mapping"
              />
            ) : (
              <FormattedMessage
                id="xpack.security.management.editRoleMapping.createRoleMappingTitle"
                defaultMessage="Create role mapping"
              />
            )}
          </h1>
        </EuiTitle>
        <EuiText color="subdued" size="s">
          <p>
            <FormattedMessage
              id="xpack.security.management.editRoleMapping.roleMappingDescription"
              defaultMessage="Use role mappings to control which roles are assigned to your users."
            />
          </p>
        </EuiText>
        {!this.state.hasCompatibleRealms && (
          <>
            <EuiSpacer size="s" />
            <NoCompatibleRealms />
          </>
        )}
      </Fragment>
    );
  };

  private getFormButtons = () => {
    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={this.saveRoleMapping}
            isLoading={this.state.saveInProgress}
            disabled={!this.state.rulesValid}
            data-test-subj="saveRoleMappingButton"
          >
            Save role mapping
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false} onClick={this.backToRoleMappingsList}>
          <EuiButton>Cancel</EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={true} />
        {this.editingExistingRoleMapping() && (
          <EuiFlexItem grow={false}>
            <DeleteProvider>
              {deleteRoleMappingsPrompt => {
                return (
                  <EuiButtonEmpty
                    onClick={() =>
                      deleteRoleMappingsPrompt([this.state.roleMapping!], () =>
                        this.backToRoleMappingsList()
                      )
                    }
                    color="danger"
                  >
                    <FormattedMessage
                      id="xpack.security.management.editRoleMapping.deleteRoleMappingButton"
                      defaultMessage="Delete role mapping"
                    />
                  </EuiButtonEmpty>
                );
              }}
            </DeleteProvider>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  };

  private onRuleValidityChange = (rulesValid: boolean) => {
    this.setState({
      rulesValid,
    });
  };

  private saveRoleMapping = () => {
    if (!this.state.roleMapping) {
      return;
    }

    const { isInvalid } = validateRoleMappingForSave(this.state.roleMapping);
    if (isInvalid) {
      this.setState({ validateForm: true });
      return;
    }

    const roleMappingName = this.state.roleMapping.name;

    this.setState({
      saveInProgress: true,
    });

    RoleMappingApi.saveRoleMapping(this.state.roleMapping)
      .then(() => {
        toastNotifications.addSuccess({
          title: i18n.translate('xpack.security.management.editRoleMapping.saveSuccess', {
            defaultMessage: `Saved role mapping '{roleMappingName}'`,
            values: {
              roleMappingName,
            },
          }),
          'data-test-subj': 'savedRoleMappingSuccessToast',
        });
        this.backToRoleMappingsList();
      })
      .catch(e => {
        toastNotifications.addError(e, {
          title: i18n.translate('xpack.security.management.editRoleMapping.saveError', {
            defaultMessage: `Error saving role mapping`,
          }),
        });

        this.setState({
          saveInProgress: false,
        });
      });
  };

  private editingExistingRoleMapping = () => typeof this.props.name === 'string';

  private async loadAppData() {
    try {
      const [features, roleMapping] = await Promise.all([
        RoleMappingApi.getRoleMappingFeatures(),
        this.editingExistingRoleMapping()
          ? RoleMappingApi.getRoleMapping(this.props.name!)
          : Promise.resolve({
              name: '',
              enabled: true,
              metadata: {},
              role_templates: [],
              roles: [],
              rules: {},
            }),
      ]);

      const {
        canManageRoleMappings,
        canUseStoredScripts,
        canUseInlineScripts,
        hasCompatibleRealms,
      } = features;

      const { role_templates: roleTemplates = [] } = roleMapping;
      const mode = roleTemplates.length > 0 ? 'templates' : 'roles';

      this.setState({
        permissionDenied: !canManageRoleMappings,
        hasCompatibleRealms,
        canUseStoredScripts,
        canUseInlineScripts,
        isLoadingApp: false,
        mode,
        roleMapping,
      });
    } catch (e) {
      if (_.get(e, 'body.statusCode') === 403) {
        this.setState({ permissionDenied: true, isLoadingApp: false });
      } else {
        toastNotifications.addDanger(
          i18n.translate(
            'xpack.security.management.editRoleMapping.table.fetchingRoleMappingsErrorMessage',
            {
              defaultMessage: 'Error checking privileges: {message}',
              values: { message: _.get(e, 'body.message', '') },
            }
          )
        );
      }
    }
  }

  private backToRoleMappingsList = () => {
    window.location.hash = ROLE_MAPPINGS_PATH;
  };
}
