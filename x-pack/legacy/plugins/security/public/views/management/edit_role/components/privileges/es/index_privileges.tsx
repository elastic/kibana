/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import React, { Component, Fragment } from 'react';
import { Role, RoleIndexPrivilege } from '../../../../../../../common/model';
import { isReadOnlyRole, isRoleEnabled } from '../../../../../../lib/role_utils';
import { getFields } from '../../../../../../objects';
import { RoleValidator } from '../../../lib/validate_role';
import { IndexPrivilegeForm } from './index_privilege_form';

interface Props {
  role: Role;
  indexPatterns: string[];
  availableIndexPrivileges: string[];
  allowDocumentLevelSecurity: boolean;
  allowFieldLevelSecurity: boolean;
  httpClient: any;
  onChange: (role: Role) => void;
  validator: RoleValidator;
}

interface State {
  availableFields: {
    [indexPrivKey: string]: string[];
  };
}

export class IndexPrivileges extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      availableFields: {},
    };
  }

  public componentDidMount() {
    this.loadAvailableFields(this.props.role.elasticsearch.indices);
  }

  public render() {
    const { indices = [] } = this.props.role.elasticsearch;

    const {
      indexPatterns,
      allowDocumentLevelSecurity,
      allowFieldLevelSecurity,
      availableIndexPrivileges,
    } = this.props;

    const props = {
      indexPatterns,
      // If editing an existing role while that has been disabled, always show the FLS/DLS fields because currently
      // a role is only marked as disabled if it has FLS/DLS setup (usually before the user changed to a license that
      // doesn't permit FLS/DLS).
      allowDocumentLevelSecurity: allowDocumentLevelSecurity || !isRoleEnabled(this.props.role),
      allowFieldLevelSecurity: allowFieldLevelSecurity || !isRoleEnabled(this.props.role),
      isReadOnlyRole: isReadOnlyRole(this.props.role),
    };

    const forms = indices.map((indexPrivilege: RoleIndexPrivilege, idx) => (
      <IndexPrivilegeForm
        key={idx}
        {...props}
        formIndex={idx}
        validator={this.props.validator}
        availableIndexPrivileges={availableIndexPrivileges}
        indexPrivilege={indexPrivilege}
        availableFields={this.state.availableFields[indexPrivilege.names.join(',')]}
        onChange={this.onIndexPrivilegeChange(idx)}
        onDelete={this.onIndexPrivilegeDelete(idx)}
      />
    ));

    return <Fragment>{forms}</Fragment>;
  }

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

  public onIndexPrivilegeChange = (privilegeIndex: number) => {
    return (updatedPrivilege: RoleIndexPrivilege) => {
      const { role } = this.props;
      const { indices } = role.elasticsearch;

      const newIndices = [...indices];
      newIndices[privilegeIndex] = updatedPrivilege;

      this.props.onChange({
        ...this.props.role,
        elasticsearch: {
          ...this.props.role.elasticsearch,
          indices: newIndices,
        },
      });

      this.loadAvailableFields(newIndices);
    };
  };

  public onIndexPrivilegeDelete = (privilegeIndex: number) => {
    return () => {
      const { role } = this.props;

      const newIndices = [...role.elasticsearch.indices];
      newIndices.splice(privilegeIndex, 1);

      this.props.onChange({
        ...this.props.role,
        elasticsearch: {
          ...this.props.role.elasticsearch,
          indices: newIndices,
        },
      });
    };
  };

  public isPlaceholderPrivilege = (indexPrivilege: RoleIndexPrivilege) => {
    return indexPrivilege.names.length === 0;
  };

  public loadAvailableFields(privileges: RoleIndexPrivilege[]) {
    // readonly roles cannot be edited, and therefore do not need to fetch available fields.
    if (isReadOnlyRole(this.props.role)) {
      return;
    }

    const patterns = privileges.map(index => index.names.join(','));

    const cachedPatterns = Object.keys(this.state.availableFields);
    const patternsToFetch = _.difference(patterns, cachedPatterns);

    const fetchRequests = patternsToFetch.map(this.loadFieldsForPattern);

    Promise.all(fetchRequests).then(response => {
      this.setState({
        availableFields: {
          ...this.state.availableFields,
          ...response.reduce((acc, o) => ({ ...acc, ...o }), {}),
        },
      });
    });
  }

  public loadFieldsForPattern = async (pattern: string) => {
    if (!pattern) {
      return { [pattern]: [] };
    }

    try {
      return {
        [pattern]: await getFields(this.props.httpClient, pattern),
      };
    } catch (e) {
      return {
        [pattern]: [],
      };
    }
  };
}
