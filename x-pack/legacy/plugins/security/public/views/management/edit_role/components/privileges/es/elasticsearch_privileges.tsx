/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiComboBox,
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';
import { Role, BuiltinESPrivileges } from '../../../../../../../common/model';
// @ts-ignore
import { documentationLinks } from '../../../../../../documentation_links';
import { RoleValidator } from '../../../lib/validate_role';
import { CollapsiblePanel } from '../../collapsible_panel';
import { ClusterPrivileges } from './cluster_privileges';

import { IndexPrivileges } from './index_privileges';

interface Props {
  role: Role;
  editable: boolean;
  httpClient: any;
  onChange: (role: Role) => void;
  runAsUsers: string[];
  validator: RoleValidator;
  builtinESPrivileges: BuiltinESPrivileges;
  indexPatterns: string[];
  allowDocumentLevelSecurity: boolean;
  allowFieldLevelSecurity: boolean;
}

export class ElasticsearchPrivileges extends Component<Props, {}> {
  public render() {
    return (
      <CollapsiblePanel iconType={'logoElasticsearch'} title={'Elasticsearch'}>
        {this.getForm()}
      </CollapsiblePanel>
    );
  }

  public getForm = () => {
    const {
      role,
      httpClient,
      validator,
      onChange,
      editable,
      indexPatterns,
      allowDocumentLevelSecurity,
      allowFieldLevelSecurity,
      builtinESPrivileges,
    } = this.props;

    const indexProps = {
      role,
      httpClient,
      validator,
      indexPatterns,
      allowDocumentLevelSecurity,
      allowFieldLevelSecurity,
      onChange,
      availableIndexPrivileges: builtinESPrivileges.index,
    };

    return (
      <Fragment>
        <EuiDescribedFormGroup
          title={
            <h3>
              <FormattedMessage
                id="xpack.security.management.editRole.elasticSearchPrivileges.clusterPrivilegesTitle"
                defaultMessage="Cluster privileges"
              />
            </h3>
          }
          description={
            <p>
              <FormattedMessage
                id="xpack.security.management.editRole.elasticSearchPrivileges.manageRoleActionsDescription"
                defaultMessage="Manage the actions this role can perform against your cluster. "
              />
              {this.learnMore(documentationLinks.esClusterPrivileges)}
            </p>
          }
        >
          <EuiFormRow fullWidth={true} hasEmptyLabelSpace>
            <ClusterPrivileges
              role={this.props.role}
              onChange={this.onClusterPrivilegesChange}
              builtinClusterPrivileges={builtinESPrivileges.cluster}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>

        <EuiSpacer />

        <EuiDescribedFormGroup
          title={
            <h3>
              <FormattedMessage
                id="xpack.security.management.editRole.elasticSearchPrivileges.runAsPrivilegesTitle"
                defaultMessage="Run As privileges"
              />
            </h3>
          }
          description={
            <p>
              <FormattedMessage
                id="xpack.security.management.editRole.elasticSearchPrivileges.howToBeSubmittedOnBehalfOfOtherUsersDescription"
                defaultMessage="Allow requests to be submitted on the behalf of other users. "
              />
              {this.learnMore(documentationLinks.esRunAsPrivileges)}
            </p>
          }
        >
          <EuiFormRow hasEmptyLabelSpace>
            <EuiComboBox
              placeholder={
                this.props.editable
                  ? i18n.translate(
                      'xpack.security.management.editRole.elasticSearchPrivileges.addUserTitle',
                      { defaultMessage: 'Add a user…' }
                    )
                  : undefined
              }
              options={this.props.runAsUsers.map(username => ({
                id: username,
                label: username,
                isGroupLabelOption: false,
              }))}
              selectedOptions={this.props.role.elasticsearch.run_as.map(u => ({ label: u }))}
              onCreateOption={this.onCreateRunAsOption}
              onChange={this.onRunAsUserChange}
              isDisabled={!editable}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>

        <EuiSpacer />

        <EuiTitle size={'xs'}>
          <h3>
            <FormattedMessage
              id="xpack.security.management.editRole.elasticSearchPrivileges.indexPrivilegesTitle"
              defaultMessage="Index privileges"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size={'s'} />
        <EuiText size={'s'} color={'subdued'}>
          <p>
            <FormattedMessage
              id="xpack.security.management.editRole.elasticSearchPrivileges.controlAccessToClusterDataDescription"
              defaultMessage="Control access to the data in your cluster. "
            />
            {this.learnMore(documentationLinks.esIndicesPrivileges)}
          </p>
        </EuiText>

        <IndexPrivileges {...indexProps} />

        <EuiHorizontalRule />

        {this.props.editable && (
          <EuiButton iconType={'plusInCircleFilled'} onClick={this.addIndexPrivilege}>
            <FormattedMessage
              id="xpack.security.management.editRole.elasticSearchPrivileges.addIndexPrivilegesButtonLabel"
              defaultMessage="Add index privilege"
            />
          </EuiButton>
        )}
      </Fragment>
    );
  };

  public learnMore = (href: string) => (
    <EuiLink className="editRole__learnMore" href={href} target={'_blank'}>
      <FormattedMessage
        id="xpack.security.management.editRole.elasticSearchPrivileges.learnMoreLinkText"
        defaultMessage="Learn more"
      />
    </EuiLink>
  );

  public addIndexPrivilege = () => {
    const { role } = this.props;

    const newIndices = [
      ...role.elasticsearch.indices,
      {
        names: [],
        privileges: [],
        field_security: {
          grant: ['*'],
        },
      },
    ];

    this.props.onChange({
      ...this.props.role,
      elasticsearch: {
        ...this.props.role.elasticsearch,
        indices: newIndices,
      },
    });
  };

  public onClusterPrivilegesChange = (cluster: string[]) => {
    const role = {
      ...this.props.role,
      elasticsearch: {
        ...this.props.role.elasticsearch,
        cluster,
      },
    };

    this.props.onChange(role);
  };

  public onRunAsUserChange = (users: any) => {
    const role = {
      ...this.props.role,
      elasticsearch: {
        ...this.props.role.elasticsearch,
        run_as: users.map((u: any) => u.label),
      },
    };

    this.props.onChange(role);
  };

  public onCreateRunAsOption = (option: any) => {
    const newRunAsUsers = this.props.role.elasticsearch.run_as.concat(option);

    const role = {
      ...this.props.role,
      elasticsearch: {
        ...this.props.role.elasticsearch,
        run_as: newRunAsUsers,
      },
    };
    this.props.onChange(role);
  };
}
