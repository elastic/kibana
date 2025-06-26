/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiIcon,
  EuiLink,
  EuiPageHeader,
  EuiPageSection,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import React, { Component } from 'react';

import type { DocLinksStart, NotificationsStart, ScopedHistory } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { MappingInfoPanel } from './mapping_info_panel';
import { RuleEditorPanel } from './rule_editor_panel';
import { validateRoleMappingForSave } from './services/role_mapping_validation';
import type {
  RoleMapping,
  RoleMappingAllRule,
  RoleMappingAnyRule,
  RoleMappingRule,
} from '../../../../common';
import type { RolesAPIClient } from '../../roles';
import type { SecurityFeaturesAPIClient } from '../../security_features';
import {
  DeleteProvider,
  NoCompatibleRealms,
  PermissionDenied,
  SectionLoading,
} from '../components';
import type { RoleMappingsAPIClient } from '../role_mappings_api_client';

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
  action: 'edit' | 'clone';
  name?: string;
  roleMappingsAPI: PublicMethodsOf<RoleMappingsAPIClient>;
  rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
  securityFeaturesAPI: PublicMethodsOf<SecurityFeaturesAPIClient>;
  notifications: NotificationsStart;
  docLinks: DocLinksStart;
  history: ScopedHistory;
  readOnly?: boolean;
}

export class EditRoleMappingPage extends Component<Props, State> {
  static defaultProps: Partial<Props> = {
    readOnly: false,
  };

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

  public async componentDidUpdate(prevProps: Props) {
    if (prevProps.name !== this.props.name) {
      await this.loadAppData();
    }
  }

  public render() {
    const { loadState } = this.state;

    if (loadState === 'permissionDenied') {
      return <PermissionDenied />;
    }

    if (loadState === 'loading') {
      return (
        <EuiPageSection alignment="center" color="subdued">
          <SectionLoading />
        </EuiPageSection>
      );
    }

    return (
      <>
        <EuiPageHeader
          bottomBorder
          pageTitle={this.getFormTitle()}
          description={
            <>
              <FormattedMessage
                id="xpack.security.management.editRoleMapping.roleMappingDescription"
                defaultMessage="Use role mappings to control which roles are assigned to your users. {learnMoreLink}"
                values={{
                  learnMoreLink: (
                    <EuiLink
                      href={this.props.docLinks.links.security.mappingRoles}
                      external={true}
                      target="_blank"
                    >
                      <FormattedMessage
                        id="xpack.security.management.editRoleMapping.learnMoreLinkText"
                        defaultMessage="Learn more about role mappings."
                      />
                    </EuiLink>
                  ),
                }}
              />
              {!this.state.hasCompatibleRealms && (
                <>
                  <EuiSpacer size="s" />
                  <NoCompatibleRealms />
                </>
              )}
            </>
          }
        />

        <EuiSpacer size="l" />

        <EuiForm isInvalid={this.state.formError.isInvalid} error={this.state.formError.error}>
          <MappingInfoPanel
            data-test-subj="roleMappingInfoPanel"
            roleMapping={this.state.roleMapping!}
            onChange={(roleMapping) => this.setState({ roleMapping })}
            mode={this.getInfoPanelMode()}
            validateForm={this.state.validateForm}
            canUseInlineScripts={this.state.canUseInlineScripts}
            canUseStoredScripts={this.state.canUseStoredScripts}
            rolesAPIClient={this.props.rolesAPIClient}
            docLinks={this.props.docLinks}
          />
          <EuiSpacer />
          <RuleEditorPanel
            data-test-subj="roleMappingRulePanel"
            rawRules={this.state.roleMapping!.rules}
            validateForm={this.state.validateForm}
            onValidityChange={this.onRuleValidityChange}
            onChange={(rules) =>
              this.setState({
                roleMapping: {
                  ...this.state.roleMapping!,
                  rules,
                },
              })
            }
            docLinks={this.props.docLinks}
            readOnly={this.isReadOnly()}
          />
          <EuiSpacer />
          {this.getFormWarnings()}
          <EuiSpacer />
          {this.getFormButtons()}
        </EuiForm>
      </>
    );
  }

  private getInfoPanelMode = () => {
    return this.isReadOnly() ? 'view' : this.editingExistingRoleMapping() ? 'edit' : 'create';
  };

  private getFormTitle = () => {
    if (this.isReadOnly()) {
      return (
        <>
          <FormattedMessage
            id="xpack.security.management.editRoleMapping.readOnlyRoleMappingTitle"
            defaultMessage="Viewing role mapping"
          />
          &nbsp;
          {this.isReadOnlyRoleMapping() && (
            <EuiToolTip
              data-test-subj="readOnlyRoleMappingTooltip"
              content={
                <FormattedMessage
                  id="xpack.security.management.editRoleMapping.readOnlyRoleMappingBadge.readOnlyRoleMappingCanNotBeModifiedTooltip"
                  defaultMessage="Read only role mappings are built-in and cannot be removed or modified."
                />
              }
            >
              <EuiIcon style={{ verticalAlign: 'super' }} type={'lock'} />
            </EuiToolTip>
          )}
        </>
      );
    }
    if (this.editingExistingRoleMapping()) {
      return (
        <FormattedMessage
          id="xpack.security.management.editRoleMapping.editRoleMappingTitle"
          defaultMessage="Edit role mapping"
        />
      );
    }
    return (
      <FormattedMessage
        id="xpack.security.management.editRoleMapping.createRoleMappingTitle"
        defaultMessage="Create role mapping"
      />
    );
  };

  private isObject = (record?: any): record is object => {
    return typeof record === 'object' && record !== null;
  };

  private isRoleMappingAnyRule = (obj: unknown): obj is RoleMappingAnyRule => {
    return this.isObject(obj) && 'any' in obj && Array.isArray(obj.any);
  };

  private isRoleMappingAllRule = (obj: unknown): obj is RoleMappingAllRule => {
    return this.isObject(obj) && 'all' in obj && Array.isArray(obj.all);
  };

  private checkEmptyAnyAllMappings = (obj: RoleMappingRule) => {
    const arrToCheck: RoleMappingRule[] = [obj];

    while (arrToCheck.length > 0) {
      const currentObj = arrToCheck.pop();
      if (this.isObject(obj)) {
        for (const key in currentObj) {
          if (Object.hasOwn(currentObj, key)) {
            if (this.isRoleMappingAnyRule(currentObj)) {
              if (currentObj.any.length === 0) {
                return true;
              }
              arrToCheck.push(...currentObj.any);
            } else if (this.isRoleMappingAllRule(currentObj)) {
              if (currentObj.all.length === 0) {
                return true;
              }
              arrToCheck.push(...currentObj.all);
            } else if (this.isObject(currentObj[key as keyof RoleMappingRule])) {
              arrToCheck.push(currentObj[key as keyof RoleMappingRule] as RoleMappingRule);
            }
          }
        }
      }
    }
    return false;
  };

  private getFormWarnings = () => {
    if (this.checkEmptyAnyAllMappings(this.state.roleMapping!.rules as RoleMappingRule)) {
      return (
        <EuiCallOut
          title="Warning"
          color="warning"
          iconType="alert"
          data-test-subj="emptyAnyOrAllRulesWarning"
        >
          <FormattedMessage
            id="xpack.security.management.editRoleMapping.emptyAnyAllMappingsWarning"
            defaultMessage="Role mapping rules contains empty 'any' or 'all' rules. These empty rule groups will always evaluate to true. Please proceed with caution"
          />
        </EuiCallOut>
      );
    }
    return null;
  };

  private getFormButtons = () => {
    if (this.isReadOnly() === true) {
      return this.getReturnToRoleMappingListButton();
    }

    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>{this.getSaveButton()}</EuiFlexItem>
        <EuiFlexItem grow={false}>{this.getCancelButton()}</EuiFlexItem>
        <EuiFlexItem grow={true} />
        {this.getDeleteButton()}
      </EuiFlexGroup>
    );
  };

  private getReturnToRoleMappingListButton = () => {
    return (
      <EuiButton
        // {...reactRouterNavigate(this.props.history, '')}
        onClick={this.backToRoleMappingsList}
        iconType="arrowLeft"
        data-test-subj="roleMappingFormReturnButton"
      >
        <FormattedMessage
          id="xpack.security.management.editRoleMapping.returnToRoleMappingListButton"
          defaultMessage="Back to role mappings"
        />
      </EuiButton>
    );
  };

  private getSaveButton = () => {
    return (
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
    );
  };

  private getCancelButton = () => {
    return (
      <EuiButton onClick={this.backToRoleMappingsList}>
        <FormattedMessage
          id="xpack.security.management.editRoleMapping.cancelButton"
          defaultMessage="Cancel"
        />
      </EuiButton>
    );
  };

  private getDeleteButton = () => {
    if (this.editingExistingRoleMapping() && !this.isReadOnly()) {
      return (
        <EuiFlexItem grow={false}>
          <DeleteProvider
            roleMappingsAPI={this.props.roleMappingsAPI}
            notifications={this.props.notifications}
          >
            {(deleteRoleMappingsPrompt) => {
              return (
                <EuiButtonEmpty
                  data-test-subj="deleteRoleMappingButton"
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
      );
    }
    return null;
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
        this.props.notifications.toasts.addSuccess({
          title: i18n.translate('xpack.security.management.editRoleMapping.saveSuccess', {
            defaultMessage: `Saved role mapping ''{roleMappingName}''`,
            values: {
              roleMappingName,
            },
          }),
          'data-test-subj': 'savedRoleMappingSuccessToast',
        });
        this.backToRoleMappingsList();
      })
      .catch((e) => {
        this.props.notifications.toasts.addError(e, {
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

  private editingExistingRoleMapping = () =>
    typeof this.props.name === 'string' && this.props.action === 'edit';

  private cloningExistingRoleMapping = () =>
    typeof this.props.name === 'string' && this.props.action === 'clone';

  private isReadOnlyRoleMapping = () => this.state.roleMapping?.metadata?._read_only;

  private isReadOnly = () => this.props.readOnly || this.isReadOnlyRoleMapping();

  private async loadAppData() {
    try {
      const [features, roleMapping] = await Promise.all([
        this.props.securityFeaturesAPI.checkFeatures(),
        this.editingExistingRoleMapping() || this.cloningExistingRoleMapping()
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

      const { canReadSecurity, canUseStoredScripts, canUseInlineScripts, hasCompatibleRealms } =
        features;

      const loadState: State['loadState'] = canReadSecurity ? 'ready' : 'permissionDenied';

      this.setState({
        loadState,
        hasCompatibleRealms,
        canUseStoredScripts,
        canUseInlineScripts,
        roleMapping: {
          ...roleMapping,
          name: this.cloningExistingRoleMapping() ? '' : roleMapping.name,
        },
      });
    } catch (e) {
      this.props.notifications.toasts.addDanger({
        title: i18n.translate(
          'xpack.security.management.editRoleMapping.table.fetchingRoleMappingsErrorMessage',
          {
            defaultMessage: 'Error loading role mapping editor: {message}',
            values: { message: e?.body?.message ?? '' },
          }
        ),
        'data-test-subj': 'errorLoadingRoleMappingEditorToast',
      });
      this.backToRoleMappingsList();
    }
  }

  private backToRoleMappingsList = () => this.props.history.push('/');
}
