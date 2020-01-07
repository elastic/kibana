/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiForm,
  EuiPageContent,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { toastNotifications } from 'ui/notify';
import { RoleMapping } from '../../../../../../common/model';
import { RoleMappingsAPI } from '../../../../../lib/role_mappings_api';
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
import { documentationLinks } from '../../services/documentation_links';

interface State {
  loadState: 'loading' | 'permissionDenied' | 'ready' | 'saveInProgress';
  roleMapping: RoleMapping | null;
  hasCompatibleRealms: boolean;
  canUseStoredScripts: boolean;
  canUseInlineScripts: boolean;
  formError: {
    isInvalid: boolean;
    error?: string;
  };
  validateForm: boolean;
  rulesValid: boolean;
}

interface Props {
  name?: string;
  roleMappingsAPI: RoleMappingsAPI;
}

export class EditRoleMappingPage extends Component<Props, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      loadState: 'loading',
      roleMapping: null,
      hasCompatibleRealms: true,
      canUseStoredScripts: true,
      canUseInlineScripts: true,
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
    const { loadState } = this.state;

    if (loadState === 'permissionDenied') {
      return <PermissionDenied />;
    }

    if (loadState === 'loading') {
      return (
        <EuiPageContent>
          <SectionLoading />
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
            rawRules={this.state.roleMapping!.rules}
            validateForm={this.state.validateForm}
            onValidityChange={this.onRuleValidityChange}
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
              defaultMessage="Use role mappings to control which roles are assigned to your users. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink
                    href={documentationLinks.getRoleMappingDocUrl()}
                    external={true}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.security.management.editRoleMapping.learnMoreLinkText"
                      defaultMessage="Learn more."
                    />
                  </EuiLink>
                ),
              }}
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
            isLoading={this.state.loadState === 'saveInProgress'}
            disabled={!this.state.rulesValid || this.state.loadState === 'saveInProgress'}
            data-test-subj="saveRoleMappingButton"
          >
            <FormattedMessage
              id="xpack.security.management.editRoleMapping.saveRoleMappingButton"
              defaultMessage="Save role mapping"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false} onClick={this.backToRoleMappingsList}>
          <EuiButton>
            <FormattedMessage
              id="xpack.security.management.editRoleMapping.cancelButton"
              defaultMessage="Cancel"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={true} />
        {this.editingExistingRoleMapping() && (
          <EuiFlexItem grow={false}>
            <DeleteProvider roleMappingsAPI={this.props.roleMappingsAPI}>
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
      loadState: 'saveInProgress',
    });

    this.props.roleMappingsAPI
      .saveRoleMapping(this.state.roleMapping)
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
          toastMessage: e?.body?.message,
        });

        this.setState({
          loadState: 'saveInProgress',
        });
      });
  };

  private editingExistingRoleMapping = () => typeof this.props.name === 'string';

  private async loadAppData() {
    try {
      const [features, roleMapping] = await Promise.all([
        this.props.roleMappingsAPI.getRoleMappingFeatures(),
        this.editingExistingRoleMapping()
          ? this.props.roleMappingsAPI.getRoleMapping(this.props.name!)
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

      const loadState: State['loadState'] = canManageRoleMappings ? 'ready' : 'permissionDenied';

      this.setState({
        loadState,
        hasCompatibleRealms,
        canUseStoredScripts,
        canUseInlineScripts,
        roleMapping,
      });
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate(
          'xpack.security.management.editRoleMapping.table.fetchingRoleMappingsErrorMessage',
          {
            defaultMessage: 'Error loading role mapping editor: {message}',
            values: { message: e?.body?.message ?? '' },
          }
        )
      );
    }
  }

  private backToRoleMappingsList = () => {
    window.location.hash = ROLE_MAPPINGS_PATH;
  };
}
