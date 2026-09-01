/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { Component, Fragment } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RoleDataSourcePrivilege } from '@kbn/security-plugin-types-common';

import type { RoleValidator } from '../../validate_role';

const fromOption = (option: EuiComboBoxOptionOption) => option.label;
const toOption = (value: string): EuiComboBoxOptionOption => ({ label: value });

interface Props {
  formIndex: number;
  dataSourcePrivilege: RoleDataSourcePrivilege;
  indexPatterns: string[];
  availableDataSourcePrivileges: RoleDataSourcePrivilege['privileges'];
  onChange: (dataSourcePrivilege: RoleDataSourcePrivilege) => void;
  onDelete: () => void;
  isRoleReadOnly: boolean;
  validator: RoleValidator;
}

export class DataSourcePrivilegeForm extends Component<Props> {
  public render() {
    return (
      <Fragment>
        <EuiSpacer size="m" />
        <EuiFlexGroup alignItems="center" responsive={false} className="data-source-privilege-form">
          <EuiFlexItem
            css={css`
              min-width: 330px;
            `}
          >
            <EuiPanel
              color="subdued"
              css={css`
                max-width: 100%;
              `}
            >
              {this.getPrivilegeForm()}
            </EuiPanel>
          </EuiFlexItem>
          {!this.props.isRoleReadOnly && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate(
                  'xpack.security.management.editRole.dataSourcePrivilegeForm.deleteDataSourcePrivilegeAriaLabel',
                  { defaultMessage: 'Delete data source privilege' }
                )}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.security.management.editRole.dataSourcePrivilegeForm.deleteDataSourcePrivilegeAriaLabel',
                    { defaultMessage: 'Delete data source privilege' }
                  )}
                  color={'danger'}
                  onClick={this.props.onDelete}
                  iconType={'trash'}
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </Fragment>
    );
  }

  private getPrivilegeForm = () => {
    return (
      <EuiFlexGrid
        css={css`
          grid-template-columns: repeat(2, minmax(0, 1fr));
        `}
      >
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.security.management.editRole.dataSourcePrivilegeForm.dataSourcesFormRowLabel"
                defaultMessage="Data sources"
              />
            }
            fullWidth
            {...this.props.validator.validateDataSourcePrivilegeNamesField(this.props.dataSourcePrivilege)}
          >
            <EuiComboBox
              data-test-subj={`dataSourcesInput${this.props.formIndex}`}
              options={this.props.indexPatterns.map(toOption)}
              selectedOptions={this.props.dataSourcePrivilege.names.map(toOption)}
              onCreateOption={this.onCreateDataSourceOption}
              onChange={this.onDataSourceChange}
              isDisabled={this.props.isRoleReadOnly}
              placeholder={i18n.translate(
                'xpack.security.management.editRole.dataSourcePrivilegeForm.dataSourcesPlaceholder',
                { defaultMessage: 'Add a data source pattern…' }
              )}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.security.management.editRole.dataSourcePrivilegeForm.privilegesFormRowLabel"
                defaultMessage="Privileges"
              />
            }
            fullWidth
            {...this.props.validator.validateDataSourcePrivilegePrivilegesField(
              this.props.dataSourcePrivilege
            )}
          >
            <EuiComboBox
              data-test-subj={`dataSourcePrivilegesInput${this.props.formIndex}`}
              options={this.props.availableDataSourcePrivileges.map(toOption)}
              selectedOptions={this.props.dataSourcePrivilege.privileges.map(toOption)}
              onChange={this.onPrivilegeChange}
              isDisabled={this.props.isRoleReadOnly}
              placeholder={i18n.translate(
                'xpack.security.management.editRole.dataSourcePrivilegeForm.privilegesPlaceholder',
                { defaultMessage: 'Add a privilege…' }
              )}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGrid>
    );
  };

  private onCreateDataSourceOption = (option: string) => {
    const names = this.props.dataSourcePrivilege.names.concat([option]);
    this.props.onChange({
      ...this.props.dataSourcePrivilege,
      names,
    });
  };

  private onDataSourceChange = (newPatterns: EuiComboBoxOptionOption[]) => {
    const names = newPatterns.map(fromOption);
    this.props.onChange({
      ...this.props.dataSourcePrivilege,
      names,
    });
  };

  private onPrivilegeChange = (newPrivileges: EuiComboBoxOptionOption[]) => {
    this.props.onChange({
      ...this.props.dataSourcePrivilege,
      privileges: newPrivileges.map(fromOption),
    });
  };
}

