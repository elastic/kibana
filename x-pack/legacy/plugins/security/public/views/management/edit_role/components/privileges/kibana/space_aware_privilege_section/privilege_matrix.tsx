/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiIcon,
  EuiIconTip,
  // @ts-ignore
  EuiInMemoryTable,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  // @ts-ignore
  EuiToolTip,
  IconType,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n/react';
import React, { Component, Fragment } from 'react';
import { Space } from '../../../../../../../../../spaces/common/model/space';
import { SpaceAvatar } from '../../../../../../../../../spaces/public/components';
import { Feature } from '../../../../../../../../../../../plugins/features/public';
import { FeaturesPrivileges, Role } from '../../../../../../../../common/model';
import { CalculatedPrivilege } from '../../../../../../../lib/kibana_privilege_calculator';
import { isGlobalPrivilegeDefinition } from '../../../../../../../lib/privilege_utils';
import { SpacesPopoverList } from '../../../spaces_popover_list';
import { PrivilegeDisplay } from './privilege_display';

const SPACES_DISPLAY_COUNT = 4;

interface Props {
  role: Role;
  spaces: Space[];
  features: Feature[];
  calculatedPrivileges: CalculatedPrivilege[];
  intl: InjectedIntl;
}

interface State {
  showModal: boolean;
}

interface TableRow {
  feature: Feature & { isBase: boolean };
  tooltip?: string;
  role: Role;
}

interface SpacesColumn {
  isGlobal: boolean;
  spacesIndex: number;
  spaces: Space[];
  privileges: {
    base: string[];
    feature: FeaturesPrivileges;
  };
}

export class PrivilegeMatrix extends Component<Props, State> {
  public state = {
    showModal: false,
  };
  public render() {
    let modal = null;
    if (this.state.showModal) {
      modal = (
        <EuiOverlayMask>
          <EuiModal className="secPrivilegeMatrix__modal" onClose={this.hideModal}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                <FormattedMessage
                  id="xpack.security.management.editRole.spacePrivilegeMatrix.modalTitle"
                  defaultMessage="Privilege summary"
                />
              </EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>{this.renderTable()}</EuiModalBody>
            <EuiModalFooter>
              <EuiButton onClick={this.hideModal} fill>
                <FormattedMessage
                  id="xpack.security.management.editRole.spacePrivilegeMatrix.closeButton"
                  defaultMessage="Close"
                />
              </EuiButton>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>
      );
    }

    return (
      <Fragment>
        <EuiButtonEmpty onClick={this.showModal}>
          <FormattedMessage
            id="xpack.security.management.editRole.spacePrivilegeMatrix.showSummaryText"
            defaultMessage="View privilege summary"
          />
        </EuiButtonEmpty>
        {modal}
      </Fragment>
    );
  }

  private renderTable = () => {
    const { role, features, intl } = this.props;

    const spacePrivileges = role.kibana;

    const globalPrivilege = this.locateGlobalPrivilege();

    const spacesColumns: SpacesColumn[] = [];

    spacePrivileges.forEach((spacePrivs, spacesIndex) => {
      spacesColumns.push({
        isGlobal: isGlobalPrivilegeDefinition(spacePrivs),
        spacesIndex,
        spaces: spacePrivs.spaces
          .map(spaceId => this.props.spaces.find(space => space.id === spaceId))
          .filter(Boolean) as Space[],
        privileges: {
          base: spacePrivs.base,
          feature: spacePrivs.feature,
        },
      });
    });

    const rows: TableRow[] = [
      {
        feature: {
          id: '*base*',
          isBase: true,
          name: intl.formatMessage({
            id: 'xpack.security.management.editRole.spacePrivilegeMatrix.basePrivilegeText',
            defaultMessage: 'Base privilege',
          }),
          app: [],
          privileges: {},
        },
        role,
      },
      ...features.map(feature => ({
        feature: {
          ...feature,
          isBase: false,
        },
        role,
      })),
    ];

    const columns = [
      {
        field: 'feature',
        name: intl.formatMessage({
          id: 'xpack.security.management.editRole.spacePrivilegeMatrix.featureColumnTitle',
          defaultMessage: 'Feature',
        }),
        width: '230px',
        render: (feature: Feature & { isBase: boolean }) => {
          return feature.isBase ? (
            <Fragment>
              <strong>{feature.name}</strong>
              <EuiIconTip
                iconProps={{
                  className: 'eui-alignTop',
                }}
                type="questionInCircle"
                content={intl.formatMessage({
                  id:
                    'xpack.security.management.editRole.spacePrivilegeMatrix.basePrivilegeTooltip',
                  defaultMessage: 'The base privilege is automatically granted to all features.',
                })}
                color="subdued"
              />
            </Fragment>
          ) : (
            <Fragment>
              {feature.icon && (
                <EuiIcon
                  className="secPrivilegeFeatureIcon"
                  size="m"
                  type={feature.icon as IconType}
                />
              )}
              {feature.name}
            </Fragment>
          );
        },
      },
      ...spacesColumns.map(item => {
        let columnWidth;
        if (item.isGlobal) {
          columnWidth = '100px';
        } else if (item.spaces.length - SPACES_DISPLAY_COUNT) {
          columnWidth = '90px';
        } else {
          columnWidth = '80px';
        }

        return {
          // TODO: this is a hacky way to determine if we are looking at the global feature
          // used for cellProps below...
          field: item.isGlobal ? 'global' : 'feature',
          width: columnWidth,
          name: (
            <div>
              {item.spaces.slice(0, SPACES_DISPLAY_COUNT).map((space: Space) => (
                <span key={space.id}>
                  <SpaceAvatar size="s" space={space} />{' '}
                  {item.isGlobal && (
                    <span>
                      <FormattedMessage
                        id="xpack.security.management.editRole.spacePrivilegeMatrix.globalSpaceName"
                        defaultMessage="Global"
                      />
                      <br />
                      <SpacesPopoverList
                        spaces={this.props.spaces.filter(s => s.id !== '*')}
                        intl={this.props.intl}
                        buttonText={this.props.intl.formatMessage({
                          id:
                            'xpack.security.management.editRole.spacePrivilegeMatrix.showAllSpacesLink',
                          defaultMessage: '(all spaces)',
                        })}
                      />
                    </span>
                  )}
                </span>
              ))}
              {item.spaces.length > SPACES_DISPLAY_COUNT && (
                <Fragment>
                  <br />
                  <SpacesPopoverList
                    spaces={item.spaces}
                    intl={this.props.intl}
                    buttonText={this.props.intl.formatMessage(
                      {
                        id:
                          'xpack.security.management.editRole.spacePrivilegeMatrix.showNMoreSpacesLink',
                        defaultMessage: '+{count} more',
                      },
                      { count: item.spaces.length - SPACES_DISPLAY_COUNT }
                    )}
                  />
                </Fragment>
              )}
            </div>
          ),
          render: (feature: Feature & { isBase: boolean }, record: TableRow) => {
            return this.renderPrivilegeDisplay(item, record, globalPrivilege.base);
          },
        };
      }),
    ];

    return (
      // @ts-ignore missing rowProps from typedef
      <EuiInMemoryTable
        columns={columns}
        items={rows}
        // @ts-ignore missing rowProps from typedef
        rowProps={(item: TableRow) => {
          return {
            className: item.feature.isBase ? 'secPrivilegeMatrix__row--isBasePrivilege' : '',
          };
        }}
        cellProps={(item: TableRow, column: Record<string, any>) => {
          return {
            className:
              column.field === 'global' ? 'secPrivilegeMatrix__cell--isGlobalPrivilege' : '',
          };
        }}
      />
    );
  };

  private renderPrivilegeDisplay = (
    column: SpacesColumn,
    { feature }: TableRow,
    globalBasePrivilege: string[]
  ) => {
    if (column.isGlobal) {
      if (feature.isBase) {
        return <PrivilegeDisplay privilege={globalBasePrivilege} />;
      }

      const featureCalculatedPrivilege = this.props.calculatedPrivileges[column.spacesIndex]
        .feature[feature.id];

      return (
        <PrivilegeDisplay
          privilege={featureCalculatedPrivilege && featureCalculatedPrivilege.actualPrivilege}
        />
      );
    } else {
      // not global

      const calculatedPrivilege = this.props.calculatedPrivileges[column.spacesIndex];

      if (feature.isBase) {
        // Space base privilege
        const actualBasePrivileges = calculatedPrivilege.base.actualPrivilege;

        return (
          <PrivilegeDisplay
            explanation={calculatedPrivilege.base}
            privilege={actualBasePrivileges}
          />
        );
      }

      const featurePrivilegeExplanation = calculatedPrivilege.feature[feature.id];

      return (
        <PrivilegeDisplay
          explanation={featurePrivilegeExplanation}
          privilege={featurePrivilegeExplanation && featurePrivilegeExplanation.actualPrivilege}
        />
      );
    }
  };

  private locateGlobalPrivilege = () => {
    return (
      this.props.role.kibana.find(spacePriv => isGlobalPrivilegeDefinition(spacePriv)) || {
        spaces: ['*'],
        base: [],
        feature: [],
      }
    );
  };

  private hideModal = () => {
    this.setState({
      showModal: false,
    });
  };

  private showModal = () => {
    this.setState({
      showModal: true,
    });
  };
}
