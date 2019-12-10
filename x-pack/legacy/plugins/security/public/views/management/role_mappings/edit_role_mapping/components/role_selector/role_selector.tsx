/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiFormRow, EuiHorizontalRule } from '@elastic/eui';
import { RoleMapping, Role } from '../../../../../../../common/model';
import { RolesApi } from '../../../../../../lib/roles_api';
import { AddRoleTemplateButton } from './add_role_template_button';
import { RoleTemplateEditor } from './role_template_editor';

interface Props {
  roleMapping: RoleMapping;
  canUseInlineScripts: boolean;
  canUseStoredScripts: boolean;
  mode: 'roles' | 'templates';
  onChange: (roleMapping: RoleMapping) => void;
}

interface State {
  roles: Role[];
}

export class RoleSelector extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = { roles: [] };
  }

  public async componentDidMount() {
    const roles = await RolesApi.getRoles();
    this.setState({ roles });
  }

  public render() {
    const { mode } = this.props;
    return (
      <EuiFormRow fullWidth>
        {mode === 'roles' ? this.getRoleComboBox() : this.getRoleTemplates()}
      </EuiFormRow>
    );
  }

  private getRoleComboBox = () => {
    const { roles = [] } = this.props.roleMapping;
    return (
      <EuiComboBox
        data-test-subj="roleMappingFormRoleComboBox"
        placeholder={i18n.translate(
          'xpack.security.management.editRoleMapping.selectRolesPlaceholder',
          { defaultMessage: 'Select one or more roles' }
        )}
        isLoading={this.state.roles.length === 0}
        options={this.state.roles.map(r => ({ label: r.name }))}
        selectedOptions={roles!.map(r => ({ label: r }))}
        onChange={selectedOptions => {
          this.props.onChange({
            ...this.props.roleMapping,
            roles: selectedOptions.map(so => so.label),
            role_templates: [],
          });
        }}
      />
    );
  };

  private getRoleTemplates = () => {
    const { role_templates: roleTemplates = [] } = this.props.roleMapping;
    return (
      <div>
        {roleTemplates.map((rt, index) => (
          <Fragment key={index}>
            <RoleTemplateEditor
              canUseStoredScripts={this.props.canUseStoredScripts}
              canUseInlineScripts={this.props.canUseInlineScripts}
              roleTemplate={rt}
              onChange={updatedTemplate => {
                const templates = [...(this.props.roleMapping.role_templates || [])];
                templates.splice(index, 1, updatedTemplate);
                this.props.onChange({
                  ...this.props.roleMapping,
                  role_templates: templates,
                });
              }}
              onDelete={() => {
                const templates = [...(this.props.roleMapping.role_templates || [])];
                templates.splice(index, 1);
                this.props.onChange({
                  ...this.props.roleMapping,
                  role_templates: templates,
                });
              }}
            />
            <EuiHorizontalRule />
          </Fragment>
        ))}
        <AddRoleTemplateButton
          canUseStoredScripts={this.props.canUseStoredScripts}
          canUseInlineScripts={this.props.canUseInlineScripts}
          onClick={type => {
            switch (type) {
              case 'inline': {
                const templates = this.props.roleMapping.role_templates || [];
                this.props.onChange({
                  ...this.props.roleMapping,
                  roles: [],
                  role_templates: [...templates, { template: { source: '' } }],
                });
                break;
              }
              case 'stored': {
                const templates = this.props.roleMapping.role_templates || [];
                this.props.onChange({
                  ...this.props.roleMapping,
                  roles: [],
                  role_templates: [...templates, { template: { id: '' } }],
                });
                break;
              }
              default:
                throw new Error(`Unsupported template type: ${type}`);
            }
          }}
        />
      </div>
    );
  };
}
