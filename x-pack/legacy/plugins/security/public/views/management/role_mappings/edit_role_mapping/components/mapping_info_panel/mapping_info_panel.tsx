/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, ChangeEvent, Fragment } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiFieldText,
  EuiLink,
  EuiIcon,
  EuiSwitch,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { RoleMapping } from '../../../../../../../common/model';
import {
  validateRoleMappingName,
  validateRoleMappingRoles,
  validateRoleMappingRoleTemplates,
} from '../../services/role_mapping_validation';
import { RoleSelector } from '../role_selector';
import { documentationLinks } from '../../../services/documentation_links';

interface Props {
  roleMapping: RoleMapping;
  onChange: (roleMapping: RoleMapping) => void;
  mode: 'create' | 'edit';
  validateForm: boolean;
  canUseInlineScripts: boolean;
  canUseStoredScripts: boolean;
}

interface State {
  rolesMode: 'roles' | 'templates';
}

export class MappingInfoPanel extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      rolesMode:
        props.roleMapping.role_templates && props.roleMapping.role_templates.length > 0
          ? 'templates'
          : 'roles',
    };
  }
  public render() {
    return (
      <EuiPanel>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.security.management.editRoleMapping.roleMappingTitle"
              defaultMessage="Role mapping"
            />
          </h2>
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
        {this.getRolesOrRoleTemplatesSelector()}
      </EuiPanel>
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
          {...(this.props.validateForm && validateRoleMappingName(this.props.roleMapping))}
        >
          <EuiFieldText
            name={'name'}
            value={this.props.roleMapping.name || ''}
            onChange={this.onNameChange}
            data-test-subj={'roleMappingFormNameInput'}
            readOnly={this.props.mode === 'edit'}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  };

  private getRolesOrRoleTemplatesSelector = () => {
    if (this.state.rolesMode === 'roles') {
      return this.getRolesSelector();
    }
    return this.getRoleTemplatesSelector();
  };

  private getRolesSelector = () => {
    const validationFunction = () => {
      if (!this.props.validateForm) {
        return {};
      }
      return validateRoleMappingRoles(this.props.roleMapping);
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
            <EuiLink
              data-test-subj="switchToRoleTemplatesButton"
              onClick={() => {
                this.onRolesModeChange('templates');
              }}
            >
              <Fragment>
                <FormattedMessage
                  id="xpack.security.management.editRoleMapping.switchToRoleTemplates"
                  defaultMessage="Switch to role templates"
                />{' '}
                <EuiIcon size="s" type="inputOutput" />
              </Fragment>
            </EuiLink>
          </EuiText>
        }
      >
        <EuiFormRow fullWidth={true} {...validationFunction()}>
          <RoleSelector
            roleMapping={this.props.roleMapping}
            mode={this.state.rolesMode}
            canUseInlineScripts={this.props.canUseInlineScripts}
            canUseStoredScripts={this.props.canUseStoredScripts}
            onChange={roleMapping => this.props.onChange(roleMapping)}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  };

  private getRoleTemplatesSelector = () => {
    const validationFunction = () => {
      if (!this.props.validateForm) {
        return {};
      }
      return validateRoleMappingRoleTemplates(this.props.roleMapping);
    };
    return (
      <EuiDescribedFormGroup
        title={
          <h3>
            <FormattedMessage
              id="xpack.security.management.editRoleMapping.roleMappingRoleTemplatesFormRowTitle"
              defaultMessage="Role Templates"
            />
          </h3>
        }
        description={
          <EuiText size="s" color="subdued">
            <span>
              <FormattedMessage
                id="xpack.security.management.editRoleMapping.roleMappingRoleTemplatesFormRowHelpText"
                defaultMessage="Create templates which describe the roles to assign to your users."
              />{' '}
              <EuiLink
                href={documentationLinks.getRoleMappingTemplateDocUrl()}
                external={true}
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.security.management.editRoleMapping.roleMappingRoleTemplatesFormRowLearnMore"
                  defaultMessage="Learn more about role templates"
                />
              </EuiLink>
            </span>
            <EuiSpacer size="xs" />
            <EuiLink
              onClick={() => {
                this.onRolesModeChange('roles');
              }}
            >
              <Fragment>
                <FormattedMessage
                  id="xpack.security.management.editRoleMapping.switchToRoles"
                  defaultMessage="Switch to roles"
                />{' '}
                <EuiIcon size="s" type="inputOutput" />
              </Fragment>
            </EuiLink>
          </EuiText>
        }
      >
        <EuiFormRow fullWidth={true} {...validationFunction()}>
          <RoleSelector
            roleMapping={this.props.roleMapping}
            mode={this.state.rolesMode}
            canUseInlineScripts={this.props.canUseInlineScripts}
            canUseStoredScripts={this.props.canUseStoredScripts}
            onChange={roleMapping => this.props.onChange(roleMapping)}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
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
            data-test-subj="roleMappingsEnabledSwitch"
            showLabel={false}
            checked={this.props.roleMapping.enabled}
            onChange={e => {
              this.props.onChange({
                ...this.props.roleMapping,
                enabled: e.target.checked,
              });
            }}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  };

  private onNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;

    this.props.onChange({
      ...this.props.roleMapping,
      name,
    });
  };

  private onRolesModeChange = (rolesMode: State['rolesMode']) => {
    const canUseTemplates = this.props.canUseInlineScripts || this.props.canUseStoredScripts;
    if (rolesMode === 'templates' && canUseTemplates) {
      // Create blank template as a starting point
      const defaultTemplate = this.props.canUseInlineScripts
        ? {
            template: { source: '' },
          }
        : {
            template: { id: '' },
          };
      this.props.onChange({
        ...this.props.roleMapping,
        roles: [],
        role_templates: [defaultTemplate],
      });
    }
    this.setState({ rolesMode });
  };
}
