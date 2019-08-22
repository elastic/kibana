/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBox, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { Component } from 'react';
import _ from 'lodash';
import { Role } from '../../../../../../../common/model';
import { isReadOnlyRole } from '../../../../../../lib/role_utils';

interface Props {
  role: Role;
  availableClusterPrivileges: string[];
  onChange: (privs: string[]) => void;
}

interface State {
  allClusterPrivileges: string[];
}

export class ClusterPrivileges extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      allClusterPrivileges: this.getAllClusterPrivileges(props),
    };
  }

  componentWillReceiveProps(nextProps: Props) {
    if (_.isEqual(nextProps.role.elasticsearch.cluster, this.props.role.elasticsearch.cluster)) {
      return;
    }
    this.setState({
      allClusterPrivileges: this.getAllClusterPrivileges(nextProps),
    });
  }

  public render() {
    return <EuiFlexGroup>{this.buildComboBox(this.state.allClusterPrivileges)}</EuiFlexGroup>;
  }

  public buildComboBox = (items: string[]) => {
    const role = this.props.role;

    const options = items.map(i => ({
      label: i,
    }));

    const selectedOptions = (role.elasticsearch.cluster || []).map(k => ({ label: k }));

    return (
      <EuiFlexItem key={'clusterPrivs'}>
        <EuiComboBox
          data-test-subj={'cluster-privileges-combobox'}
          options={options}
          selectedOptions={selectedOptions}
          onChange={this.onClusterPrivilegesChange}
          onCreateOption={this.onCreateCustomPrivilege}
          isDisabled={isReadOnlyRole(role)}
        />
      </EuiFlexItem>
    );
  };

  public onClusterPrivilegesChange = (selectedPrivileges: any) => {
    this.props.onChange(selectedPrivileges.map((priv: any) => priv.label));
  };

  private onCreateCustomPrivilege = (customPrivilege: string) => {
    this.props.onChange([...this.props.role.elasticsearch.cluster, customPrivilege]);
  };

  private getAllClusterPrivileges = (props: Props) => {
    const allClusterPrivileges = [
      ...props.availableClusterPrivileges,
      ...props.role.elasticsearch.cluster,
    ];

    return _.uniq(allClusterPrivileges);
  };
}
