/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { get } from 'lodash';
import React, { ChangeEvent, Component, Fragment, HTMLProps } from 'react';
import { UICapabilities } from 'ui/capabilities';
import { toastNotifications } from 'ui/notify';
import { Space } from '../../../../../../spaces/common/model/space';
import { Feature } from '../../../../../../../../plugins/features/server';
import {
  KibanaPrivileges,
  RawKibanaPrivileges,
  Role,
  BuiltinESPrivileges,
} from '../../../../../common/model';
import {
  isReadOnlyRole,
  isReservedRole,
  copyRole,
  prepareRoleClone,
} from '../../../../lib/role_utils';
import { deleteRole, saveRole } from '../../../../objects';
import { ROLES_PATH } from '../../management_urls';
import { RoleValidationResult, RoleValidator } from '../lib/validate_role';
import { DeleteRoleButton } from './delete_role_button';
import { ElasticsearchPrivileges, KibanaPrivilegesRegion } from './privileges';
import { ReservedRoleBadge } from './reserved_role_badge';

interface Props {
  action: 'edit' | 'clone';
  role: Role;
  runAsUsers: string[];
  indexPatterns: string[];
  httpClient: any;
  allowDocumentLevelSecurity: boolean;
  allowFieldLevelSecurity: boolean;
  kibanaPrivileges: RawKibanaPrivileges;
  builtinESPrivileges: BuiltinESPrivileges;
  spaces?: Space[];
  spacesEnabled: boolean;
  intl: InjectedIntl;
  uiCapabilities: UICapabilities;
  features: Feature[];
}

interface State {
  role: Role;
  formError: RoleValidationResult | null;
}

class EditRolePageUI extends Component<Props, State> {
  private validator: RoleValidator;

  constructor(props: Props) {
    super(props);

    this.validator = new RoleValidator({ shouldValidate: false });

    let role: Role;
    if (props.action === 'clone') {
      role = prepareRoleClone(props.role);
    } else {
      role = copyRole(props.role);
    }

    this.state = {
      role,
      formError: null,
    };
  }

  public UNSAFE_componentWillMount() {
    if (this.props.action === 'clone' && isReservedRole(this.props.role)) {
      this.backToRoleList();
    }
  }

  public render() {
    const description = this.props.spacesEnabled ? (
      <FormattedMessage
        id="xpack.security.management.editRole.setPrivilegesToKibanaSpacesDescription"
        defaultMessage="Set privileges on your Elasticsearch data and control access to your Kibana spaces."
      />
    ) : (
      <FormattedMessage
        id="xpack.security.management.editRole.setPrivilegesToKibanaDescription"
        defaultMessage="Set privileges on your Elasticsearch data and control access to Kibana."
      />
    );

    return (
      <div className="editRolePage">
        <EuiForm {...this.state.formError}>
          {this.getFormTitle()}

          <EuiSpacer />

          <EuiText size="s">{description}</EuiText>

          {isReservedRole(this.state.role) && (
            <Fragment>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                <p id="reservedRoleDescription" tabIndex={0}>
                  <FormattedMessage
                    id="xpack.security.management.editRole.modifyingReversedRolesDescription"
                    defaultMessage="Reserved roles are built-in and cannot be removed or modified."
                  />
                </p>
              </EuiText>
            </Fragment>
          )}

          <EuiSpacer />

          {this.getRoleName()}

          {this.getElasticsearchPrivileges()}

          {this.getKibanaPrivileges()}

          <EuiSpacer />

          {this.getFormButtons()}
        </EuiForm>
      </div>
    );
  }

  private getFormTitle = () => {
    let titleText;
    const props: HTMLProps<HTMLDivElement> = {
      tabIndex: 0,
    };
    if (isReservedRole(this.state.role)) {
      titleText = (
        <FormattedMessage
          id="xpack.security.management.editRole.viewingRoleTitle"
          defaultMessage="Viewing role"
        />
      );
      props['aria-describedby'] = 'reservedRoleDescription';
    } else if (this.editingExistingRole()) {
      titleText = (
        <FormattedMessage
          id="xpack.security.management.editRole.editRoleTitle"
          defaultMessage="Edit role"
        />
      );
    } else {
      titleText = (
        <FormattedMessage
          id="xpack.security.management.editRole.createRoleTitle"
          defaultMessage="Create role"
        />
      );
    }

    return (
      <EuiTitle size="l">
        <h1 {...props}>
          {titleText} <ReservedRoleBadge role={this.state.role} />
        </h1>
      </EuiTitle>
    );
  };

  private getActionButton = () => {
    if (this.editingExistingRole() && !isReadOnlyRole(this.state.role)) {
      return (
        <EuiFlexItem grow={false}>
          <DeleteRoleButton canDelete={true} onDelete={this.handleDeleteRole} />
        </EuiFlexItem>
      );
    }

    return null;
  };

  private getRoleName = () => {
    return (
      <EuiPanel>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.security.management.editRole.roleNameFormRowTitle"
              defaultMessage="Role name"
            />
          }
          helpText={
            !isReservedRole(this.state.role) && this.editingExistingRole() ? (
              <FormattedMessage
                id="xpack.security.management.editRole.roleNameFormRowHelpText"
                defaultMessage="A role's name cannot be changed once it has been created."
              />
            ) : (
              undefined
            )
          }
          {...this.validator.validateRoleName(this.state.role)}
        >
          <EuiFieldText
            name={'name'}
            value={this.state.role.name || ''}
            onChange={this.onNameChange}
            data-test-subj={'roleFormNameInput'}
            readOnly={isReservedRole(this.state.role) || this.editingExistingRole()}
          />
        </EuiFormRow>
      </EuiPanel>
    );
  };

  private onNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const name = rawValue.replace(/\s/g, '_');

    this.setState({
      role: {
        ...this.state.role,
        name,
      },
    });
  };

  private getElasticsearchPrivileges() {
    return (
      <div>
        <EuiSpacer />
        <ElasticsearchPrivileges
          role={this.state.role}
          editable={!isReadOnlyRole(this.state.role)}
          httpClient={this.props.httpClient}
          onChange={this.onRoleChange}
          runAsUsers={this.props.runAsUsers}
          validator={this.validator}
          indexPatterns={this.props.indexPatterns}
          builtinESPrivileges={this.props.builtinESPrivileges}
          allowDocumentLevelSecurity={this.props.allowDocumentLevelSecurity}
          allowFieldLevelSecurity={this.props.allowFieldLevelSecurity}
        />
      </div>
    );
  }

  private onRoleChange = (role: Role) => {
    this.setState({
      role,
    });
  };

  private getKibanaPrivileges = () => {
    return (
      <div>
        <EuiSpacer />
        <KibanaPrivilegesRegion
          kibanaPrivileges={new KibanaPrivileges(this.props.kibanaPrivileges)}
          spaces={this.props.spaces}
          spacesEnabled={this.props.spacesEnabled}
          features={this.props.features}
          uiCapabilities={this.props.uiCapabilities}
          editable={!isReadOnlyRole(this.state.role)}
          role={this.state.role}
          onChange={this.onRoleChange}
          validator={this.validator}
          intl={this.props.intl}
        />
      </div>
    );
  };

  private getFormButtons = () => {
    if (isReadOnlyRole(this.state.role)) {
      return this.getReturnToRoleListButton();
    }

    return (
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>{this.getSaveButton()}</EuiFlexItem>
        <EuiFlexItem grow={false}>{this.getCancelButton()}</EuiFlexItem>
        <EuiFlexItem grow={true} />
        {this.getActionButton()}
      </EuiFlexGroup>
    );
  };

  private getReturnToRoleListButton = () => {
    return (
      <EuiButton onClick={this.backToRoleList} data-test-subj="roleFormReturnButton">
        <FormattedMessage
          id="xpack.security.management.editRole.returnToRoleListButtonLabel"
          defaultMessage="Return to role list"
        />
      </EuiButton>
    );
  };

  private getSaveButton = () => {
    const saveText = this.editingExistingRole() ? (
      <FormattedMessage
        id="xpack.security.management.editRole.updateRoleText"
        defaultMessage="Update role"
      />
    ) : (
      <FormattedMessage
        id="xpack.security.management.editRole.createRoleText"
        defaultMessage="Create role"
      />
    );

    return (
      <EuiButton
        data-test-subj={`roleFormSaveButton`}
        fill
        onClick={this.saveRole}
        disabled={isReservedRole(this.state.role)}
      >
        {saveText}
      </EuiButton>
    );
  };

  private getCancelButton = () => {
    return (
      <EuiButtonEmpty data-test-subj={`roleFormCancelButton`} onClick={this.backToRoleList}>
        <FormattedMessage
          id="xpack.security.management.editRole.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      </EuiButtonEmpty>
    );
  };

  private editingExistingRole = () => {
    return !!this.props.role.name && this.props.action === 'edit';
  };

  private saveRole = () => {
    this.validator.enableValidation();

    const result = this.validator.validateForSave(this.state.role);
    if (result.isInvalid) {
      this.setState({
        formError: result,
      });
    } else {
      this.setState({
        formError: null,
      });

      const { httpClient, intl, spacesEnabled } = this.props;

      saveRole(httpClient, this.state.role, spacesEnabled)
        .then(() => {
          toastNotifications.addSuccess(
            intl.formatMessage({
              id: 'xpack.security.management.editRole.roleSuccessfullySavedNotificationMessage',
              defaultMessage: 'Saved role',
            })
          );
          this.backToRoleList();
        })
        .catch((error: any) => {
          toastNotifications.addDanger(get(error, 'data.message'));
        });
    }
  };

  private handleDeleteRole = () => {
    const { httpClient, role, intl } = this.props;

    deleteRole(httpClient, role.name)
      .then(() => {
        toastNotifications.addSuccess(
          intl.formatMessage({
            id: 'xpack.security.management.editRole.roleSuccessfullyDeletedNotificationMessage',
            defaultMessage: 'Deleted role',
          })
        );
        this.backToRoleList();
      })
      .catch((error: any) => {
        toastNotifications.addDanger(get(error, 'data.message'));
      });
  };

  private backToRoleList = () => {
    window.location.hash = ROLES_PATH;
  };
}

export const EditRolePage = injectI18n(EditRolePageUI);
