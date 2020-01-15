/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore
  EuiButtonGroup,
  EuiIcon,
  EuiIconTip,
  EuiInMemoryTable,
  EuiText,
  IconType,
  EuiButtonIcon,
  EuiBasicTableColumn,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n/react';
import _ from 'lodash';
import React, { Component } from 'react';
import { POCPrivilegeCalculator } from 'plugins/security/lib/poc_privilege_calculator/poc_privilege_calculator';
import { IFeature } from '../../../../../../../../../../../plugins/features/common';
import { KibanaPrivileges } from '../../../../../../../../../../../plugins/security/common/model/poc_kibana_privileges';
import { Privilege } from '../../../../../../../../../../../plugins/security/common/model/poc_kibana_privileges/privilege_instance';
import { Role } from '../../../../../../../../common/model';
import { NO_PRIVILEGE_VALUE } from '../../../../lib/constants';
import { PrivilegeDisplay } from '../space_aware_privilege_section/privilege_display';
import { ChangeAllPrivilegesControl } from './change_all_privileges';
import { FeatureTableExpandedRow } from './feature_table_expanded_row';

interface Props {
  role: Role;
  features: IFeature[];
  privilegeCalculator: POCPrivilegeCalculator;
  kibanaPrivileges: KibanaPrivileges;
  intl: InjectedIntl;
  spacesIndex: number;
  onChange: (featureId: string, privileges: string[]) => void;
  onChangeAll: (privileges: string[]) => void;
  disabled?: boolean;
}

interface State {
  expandedFeatures: string[];
}

interface TableRow {
  featureId: string;
  feature: IFeature;
  inherited: Privilege[];
  effective: Privilege[];
  role: Role;
}

export class FeatureTable extends Component<Props, State> {
  public static defaultProps = {
    spacesIndex: -1,
    showLocks: true,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      expandedFeatures: ['discover'],
    };
  }

  public render() {
    const { role, features, privilegeCalculator, spacesIndex } = this.props;

    const items: TableRow[] = features
      .sort((feature1, feature2) => {
        if ((feature1.privileges || []).length === 0 && (feature2.privileges || []).length > 0) {
          return 1;
        }

        if ((feature2.privileges || []).length === 0 && (feature1.privileges || []).length > 0) {
          return -1;
        }

        return 0;
      })
      .map(feature => {
        const inherited = privilegeCalculator.getInheritedFeaturePrivileges(
          role,
          spacesIndex,
          feature.id
        );

        const effective = privilegeCalculator.getEffectiveFeaturePrivileges(
          role,
          spacesIndex,
          feature.id
        );

        return {
          featureId: feature.id,
          feature,
          inherited,
          effective,
          role,
        };
      });

    return (
      <EuiInMemoryTable
        responsive={false}
        columns={this.getColumns()}
        itemId={'featureId'}
        itemIdToExpandedRowMap={this.state.expandedFeatures.reduce((acc, featureId) => {
          return {
            ...acc,
            [featureId]: (
              <FeatureTableExpandedRow
                spacesIndex={this.props.spacesIndex}
                feature={this.props.features.find(f => f.id === featureId)!}
                onChange={this.props.onChange}
                role={this.props.role}
                privilegeCalculator={this.props.privilegeCalculator}
                disabled={this.props.disabled}
              />
            ),
          };
        }, {})}
        items={items}
      />
    );
  }

  public onChange = (featureId: string) => (featurePrivilegeId: string) => {
    const privilege = featurePrivilegeId.substr(`${featureId}_`.length);
    if (privilege === NO_PRIVILEGE_VALUE) {
      this.props.onChange(featureId, []);
    } else {
      this.props.onChange(featureId, [privilege]);
    }
  };

  private getColumns = () => {
    const columns = [
      {
        field: 'feature',
        name: this.props.intl.formatMessage({
          id:
            'xpack.security.management.editRole.featureTable.enabledRoleFeaturesFeatureColumnTitle',
          defaultMessage: 'Feature',
        }),
        render: (feature: IFeature) => {
          let tooltipElement = null;
          if (feature.privilegesTooltip) {
            const tooltipContent = (
              <EuiText>
                <p>{feature.privilegesTooltip}</p>
              </EuiText>
            );
            tooltipElement = (
              <EuiIconTip
                iconProps={{
                  className: 'eui-alignTop',
                }}
                type={'iInCircle'}
                color={'subdued'}
                content={tooltipContent}
              />
            );
          }

          return (
            <span>
              <EuiIcon
                size="m"
                type={feature.icon as IconType}
                className="secPrivilegeFeatureIcon"
              />
              {feature.name} {tooltipElement}
            </span>
          );
        },
      },
      {
        field: 'privilege',
        width: '*',
        name: (
          <span>
            <FormattedMessage
              id="xpack.security.management.editRole.featureTable.enabledRoleFeaturesEnabledColumnTitle"
              defaultMessage="Privilege"
            />
            {!this.props.disabled && (
              <ChangeAllPrivilegesControl
                privileges={[NO_PRIVILEGE_VALUE]}
                onChange={this.onChangeAllFeaturePrivileges}
              />
            )}
          </span>
        ),
        render: (roleEntry: Role, record: TableRow) => {
          const { id: featureId, name: featureName, reserved, privileges = [] } = record.feature;

          if (reserved && privileges.length === 0) {
            return <EuiText size={'s'}>{reserved.description}</EuiText>;
          }

          const featurePrivileges = this.props.kibanaPrivileges.getFeaturePrivileges(featureId);

          if (featurePrivileges.length === 0) {
            return null;
          }

          const enabledFeaturePrivileges = this.getEnabledFeaturePrivileges(
            featurePrivileges,
            featureId
          );

          const allowsNone =
            this.props.privilegeCalculator.getInheritedFeaturePrivileges(
              this.props.role,
              this.props.spacesIndex,
              featureId
            ).length === 0;

          const effectiveFeaturePrivileges = this.props.privilegeCalculator.getEffectiveFeaturePrivileges(
            this.props.role,
            this.props.spacesIndex,
            featureId
          );

          const selectedPrivilege = effectiveFeaturePrivileges.find(afp =>
            record.feature.privileges?.find(featurePriv => afp.id === featurePriv.id)
          );

          const canChangePrivilege =
            !this.props.disabled && (allowsNone || enabledFeaturePrivileges.length > 1);

          if (!canChangePrivilege) {
            const assignedBasePrivilege =
              this.props.role.kibana[this.props.spacesIndex].base.length > 0;

            const excludedFromBasePrivilegsTooltip = (
              <FormattedMessage
                id="xpack.security.management.editRole.featureTable.excludedFromBasePrivilegsTooltip"
                defaultMessage='Use "Custom" privileges to grant access. {featureName} isn&apos;t part of the base privileges.'
                values={{ featureName }}
              />
            );

            return (
              <PrivilegeDisplay
                privilege={selectedPrivilege?.id}
                tooltipContent={
                  assignedBasePrivilege && effectiveFeaturePrivileges.length === 0
                    ? excludedFromBasePrivilegsTooltip
                    : undefined
                }
              />
            );
          }

          const options = record.feature.privileges!.map(priv => {
            return {
              id: `${featureId}_${priv.id}`,
              label: priv.name,
              isDisabled: !enabledFeaturePrivileges.some(ep => ep.id === priv.id),
            };
          });

          options.push({
            id: `${featureId}_${NO_PRIVILEGE_VALUE}`,
            label: 'None',
            isDisabled: !allowsNone,
          });

          return (
            <EuiButtonGroup
              name={`featurePrivilege_${featureId}`}
              buttonSize="s"
              isFullWidth={true}
              options={options}
              idSelected={`${featureId}_${selectedPrivilege?.id ?? NO_PRIVILEGE_VALUE}`}
              onChange={this.onChange(featureId)}
            />
          );
        },
      },
      {
        align: 'right',
        width: '40px',
        isExpander: true,
        field: 'featureId',
        name: '',
        render: (featureId: string) => (
          <EuiButtonIcon
            onClick={() => this.toggleExpandedFeature(featureId)}
            aria-label={this.state.expandedFeatures.includes(featureId) ? 'Collapse' : 'Expand'}
            iconType={this.state.expandedFeatures.includes(featureId) ? 'arrowUp' : 'arrowDown'}
          />
        ),
      },
    ] as Array<EuiBasicTableColumn<TableRow>>;
    return columns;
  };

  private toggleExpandedFeature = (featureId: string) => {
    if (this.state.expandedFeatures.includes(featureId)) {
      this.setState({
        expandedFeatures: this.state.expandedFeatures.filter(ef => ef !== featureId),
      });
    } else {
      this.setState({
        expandedFeatures: [...this.state.expandedFeatures, featureId],
      });
    }
  };

  private getEnabledFeaturePrivileges = (
    featurePrivileges: Privilege[],
    featureId: string
  ): Privilege[] => {
    return featurePrivileges;
  };

  private onChangeAllFeaturePrivileges = (privilege: string) => {
    if (privilege === NO_PRIVILEGE_VALUE) {
      this.props.onChangeAll([]);
    } else {
      this.props.onChangeAll([privilege]);
    }
  };
}
