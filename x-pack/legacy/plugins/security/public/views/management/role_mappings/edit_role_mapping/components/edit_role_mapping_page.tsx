/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, ChangeEvent, Fragment } from 'react';
import {
  EuiCallOut,
  EuiDescribedFormGroup,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPageContent,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
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
import { RuleEditor } from './rule_editor';
import { RoleSelector } from './role_selector';
import { NoCompatibleRealms, PermissionDenied, DeleteProvider } from '../../components';
import { ROLE_MAPPINGS_PATH } from '../../../management_urls';
import {
  validateRoleMappingName,
  validateRoleMappingRoles,
  validateRoleMappingRoleTemplates,
  validateRoleMappingForSave,
  validateRoleMappingRules,
} from '../services/role_mapping_validation';

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
          <EuiEmptyPrompt
            title={<EuiLoadingSpinner size="xl" />}
            body={
              <EuiText color="subdued">
                <FormattedMessage
                  id="xpack.security.management.editRoleMapping.table.loadingRoleMappingDescription"
                  defaultMessage="Loading…"
                />
              </EuiText>
            }
            data-test-subj="sectionLoading"
          />
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
          <EuiTitle>
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
          <EuiSpacer />
          <EuiPanel>
            <EuiTitle>
              <h2>Role mapping</h2>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.security.management.editRoleMapping.configureRoleMappingText"
                  defaultMessage="Configure your role mapping."
                />
              </p>
            </EuiText>
            <EuiSpacer />
            {this.getRoleMappingName()}
            {this.getEnabledSwitch()}
            {this.getRolesSelector()}
          </EuiPanel>
          <EuiSpacer />
          <EuiPanel>
            <EuiTitle>
              <h2>Mapping rules</h2>
            </EuiTitle>
            {this.getRuleEditor()}
          </EuiPanel>
          <EuiSpacer />
          {this.getFormButtons()}
        </EuiForm>
      </div>
    );
  }

  private getRoleMappingName = () => {
    return (
      <EuiDescribedFormGroup
        title={
          <h3>
            <FormattedMessage
              id="xpack.security.management.editRoleMapping.roleMappingNameFormRowTitle"
              defaultMessage="Name"
            />
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.security.management.editRoleMapping.roleMappingNameFormRowHelpText"
            defaultMessage="The distinct name that identifies the role mapping. The name is used solely as an identifier; it does not affect the behavior of the mapping in any way."
          />
        }
      >
        <EuiFormRow
          hasEmptyLabelSpace
          {...(this.state.validateForm && validateRoleMappingName(this.state.roleMapping!))}
        >
          <EuiFieldText
            name={'name'}
            value={this.state.roleMapping!.name || ''}
            onChange={this.onNameChange}
            data-test-subj={'roleMappingFormNameInput'}
            readOnly={this.editingExistingRoleMapping()}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  };

  private getRolesSelector = () => {
    const validationFunction = () => {
      if (!this.state.validateForm) {
        return {};
      }
      if (this.state.mode === 'roles') {
        return validateRoleMappingRoles(this.state.roleMapping!);
      }
      return validateRoleMappingRoleTemplates(this.state.roleMapping!);
    };
    return (
      <EuiDescribedFormGroup
        title={
          <h3>
            <FormattedMessage
              id="xpack.security.management.editRoleMapping.roleMappingRolesFormRowTitle"
              defaultMessage="Roles"
            />
          </h3>
        }
        description={
          <EuiText size="s" color="subdued">
            <span>
              <FormattedMessage
                id="xpack.security.management.editRoleMapping.roleMappingRolesFormRowHelpText"
                defaultMessage="Choose which roles to assign to your users."
              />
            </span>
            <EuiSpacer size="xs" />
            {this.state.mode === 'templates' ? (
              <EuiButtonEmpty
                size="xs"
                onClick={() => {
                  this.setState({ mode: 'roles' });
                }}
                iconType="inputOutput"
                iconSide="right"
                style={{ marginLeft: '0px' }}
              >
                Switch to roles
              </EuiButtonEmpty>
            ) : (
              <EuiButtonEmpty
                size="xs"
                onClick={() => {
                  this.setState({ mode: 'templates' });
                }}
                iconType="inputOutput"
                iconSide="right"
                style={{ marginLeft: '0px' }}
              >
                Switch to role templates
              </EuiButtonEmpty>
            )}
          </EuiText>
        }
      >
        <EuiFormRow fullWidth={true} {...validationFunction()}>
          <RoleSelector
            roleMapping={this.state.roleMapping!}
            mode={this.state.mode}
            canUseInlineScripts={this.state.canUseInlineScripts}
            canUseStoredScripts={this.state.canUseStoredScripts}
            onChange={roleMapping => this.setState({ roleMapping })}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  };

  private getRuleEditor = () => {
    const validationResult =
      this.state.validateForm && validateRoleMappingRules(this.state.roleMapping!);

    let validationWarning = null;
    if (validationResult) {
      validationWarning = (
        <Fragment>
          <EuiCallOut color="danger" title={validationResult.error || 'FIXME YO'} size="s" />
        </Fragment>
      );
    }

    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.security.management.editRoleMapping.roleMappingRulesFormRowHelpText"
                defaultMessage="Roles will be assigned to users matching these rules."
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            {...(this.state.validateForm && validateRoleMappingRules(this.state.roleMapping!))}
          >
            <Fragment>
              {validationWarning}
              <RuleEditor
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
            </Fragment>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  private getEnabledSwitch = () => {
    return (
      <EuiDescribedFormGroup
        title={
          <h3>
            <FormattedMessage
              id="xpack.security.management.editRoleMapping.roleMappingEnabledFormRowTitle"
              defaultMessage="Enabled"
            />
          </h3>
        }
        description={
          <FormattedMessage
            id="xpack.security.management.editRoleMapping.roleMappingEnabledFormRowHelpText"
            defaultMessage="Mappings that are disabled are ignored when role mapping is performed."
          />
        }
      >
        <EuiFormRow hasEmptyLabelSpace>
          <EuiSwitch
            name={'enabled'}
            label={'enabled'}
            showLabel={false}
            checked={this.state.roleMapping!.enabled}
            onChange={e => {
              this.setState({
                roleMapping: {
                  ...this.state.roleMapping!,
                  enabled: e.target.checked,
                },
              });
            }}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  };

  private onNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;

    this.setState({
      roleMapping: {
        ...this.state.roleMapping!,
        name,
      },
    });
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
