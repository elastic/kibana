/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './feature_table.scss';

import type { EuiAccordionProps, EuiButtonGroupOptionProps } from '@elastic/eui';
import {
  EuiAccordion,
  EuiButtonGroup,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import classNames from 'classnames';
import type { ReactElement } from 'react';
import React, { Component } from 'react';

import type { AppCategory } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Role } from '@kbn/security-plugin-types-common';
import type { KibanaPrivileges, SecuredFeature } from '@kbn/security-role-management-model';

import { ChangeAllPrivilegesControl } from './change_all_privileges';
import { FeatureTableCell } from './components/feature_table_cell';
import { FeatureTableExpandedRow } from './feature_table_expanded_row';
import { NO_PRIVILEGE_VALUE } from '../constants';
import type { PrivilegeFormCalculator } from '../privilege_form_calculator';

interface Props {
  role: Role;
  privilegeCalculator: PrivilegeFormCalculator;
  kibanaPrivileges: KibanaPrivileges;
  privilegeIndex: number;
  onChange: (featureId: string, privileges: string[]) => void;
  onChangeAll: (privileges: string[]) => void;
  showAdditionalPermissionsMessage: boolean;
  canCustomizeSubFeaturePrivileges: boolean;
  allSpacesSelected: boolean;
  disabled?: boolean;
}

interface State {
  expandedPrivilegeControls: Set<string>;
}

export class FeatureTable extends Component<Props, State> {
  public static defaultProps = {
    privilegeIndex: -1,
    showLocks: true,
  };

  private featureCategories: Map<string, SecuredFeature[]> = new Map();

  constructor(props: Props) {
    super(props);

    // features are static for the lifetime of the page, so this is safe to do here in a non-reactive manner
    props.kibanaPrivileges
      .getSecuredFeatures()
      .filter((feature) => feature.privileges != null || feature.reserved != null)
      .forEach((feature) => {
        if (!this.featureCategories.has(feature.category.id)) {
          this.featureCategories.set(feature.category.id, []);
        }

        this.featureCategories.get(feature.category.id)!.push(feature);
      });

    this.state = { expandedPrivilegeControls: new Set() };
  }

  public render() {
    const basePrivileges = this.props.kibanaPrivileges.getBasePrivileges(
      this.props.role.kibana[this.props.privilegeIndex]
    );

    const accordions: Array<{ order: number; element: ReactElement }> = [];
    this.featureCategories.forEach((featuresInCategory) => {
      const { category } = featuresInCategory[0];

      const featureCount = featuresInCategory.length;
      const grantedCount = featuresInCategory.filter(
        (feature) =>
          this.props.privilegeCalculator.getEffectivePrimaryFeaturePrivilege(
            feature.id,
            this.props.privilegeIndex,
            this.props.allSpacesSelected
          ) != null
      ).length;

      const canExpandCategory = true; // featuresInCategory.length > 1;

      const buttonContent = (
        <EuiFlexGroup
          data-test-subj={`featureCategoryButton_${category.id}`}
          alignItems={'center'}
          responsive={false}
          gutterSize="m"
        >
          {category.euiIconType ? (
            <EuiFlexItem grow={false}>
              <EuiIcon size="m" type={category.euiIconType} />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={1}>
            <EuiTitle size="xs">
              <h4 className="eui-displayInlineBlock">{category.label}</h4>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      );

      const label: string = i18n.translate(
        'xpack.security.management.editRole.featureTable.featureAccordionSwitchLabel',
        {
          defaultMessage:
            '{grantedCount} / {featureCount} {featureCount, plural, one {feature} other {features}} granted',
          values: {
            grantedCount,
            featureCount,
          },
        }
      );
      const extraAction = (
        <EuiText size="s" aria-hidden="true" color={'subdued'} data-test-subj="categoryLabel">
          {label}
        </EuiText>
      );

      const helpText = this.getCategoryHelpText(category);

      const accordion = (
        <EuiAccordion
          id={`featureCategory_${category.id}`}
          data-test-subj={`featureCategory_${category.id}`}
          key={category.id}
          arrowDisplay={canExpandCategory ? 'left' : 'none'}
          forceState={canExpandCategory ? undefined : 'closed'}
          buttonContent={buttonContent}
          buttonProps={{ 'data-test-subj': `featureCategory_${category.id}_accordionToggle` }}
          extraAction={canExpandCategory ? extraAction : undefined}
        >
          <div>
            <EuiSpacer size="s" />
            {helpText && (
              <>
                <EuiCallOut size="s" title={helpText} />
                <EuiSpacer size="s" />
              </>
            )}
            <EuiFlexGroup direction="column" gutterSize="s">
              {featuresInCategory.map((feature) => (
                <EuiFlexItem
                  key={feature.id}
                  data-test-subj={`featureCategory_${category.id}_${feature.id}`}
                >
                  {this.renderPrivilegeControlsForFeature(feature)}
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </div>
        </EuiAccordion>
      );

      accordions.push({
        order: category.order ?? Number.MAX_SAFE_INTEGER,
        element: accordion,
      });
    });

    accordions.sort((a1, a2) => a1.order - a2.order);

    return (
      <div>
        <EuiFlexGroup alignItems={'flexEnd'}>
          <EuiFlexItem />
          {!this.props.disabled && (
            <EuiFlexItem grow={false}>
              <ChangeAllPrivilegesControl
                privileges={basePrivileges}
                onChange={this.onChangeAllFeaturePrivileges}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiHorizontalRule margin={'m'} />
        {accordions.flatMap((a, idx) => [
          a.element,
          <EuiHorizontalRule key={`accordion-hr-${idx}`} margin={'m'} />,
        ])}
      </div>
    );
  }

  private renderPrivilegeControlsForFeature = (feature: SecuredFeature) => {
    const renderFeatureMarkup = (
      buttonContent: EuiAccordionProps['buttonContent'],
      extraAction: EuiAccordionProps['extraAction'],
      infoIcon: JSX.Element
    ) => {
      const hasSubFeaturePrivileges = feature.getSubFeaturePrivileges().length > 0;

      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>{infoIcon}</EuiFlexItem>
          <EuiFlexItem className="eui-fullWidth">
            <EuiAccordion
              id={`featurePrivilegeControls_${feature.id}`}
              data-test-subj="featurePrivilegeControls"
              buttonContent={buttonContent}
              buttonClassName="euiAccordionWithDescription"
              buttonProps={{
                'data-test-subj': `featurePrivilegeControls_${feature.category.id}_${feature.id}_accordionToggle`,
              }}
              extraAction={extraAction}
              forceState={hasSubFeaturePrivileges ? undefined : 'closed'}
              arrowDisplay={hasSubFeaturePrivileges ? 'left' : 'none'}
              onToggle={(isOpen: boolean) => {
                if (isOpen) {
                  this.state.expandedPrivilegeControls.add(feature.id);
                } else {
                  this.state.expandedPrivilegeControls.delete(feature.id);
                }

                this.setState({
                  expandedPrivilegeControls: new Set([...this.state.expandedPrivilegeControls]),
                });
              }}
            >
              <EuiSpacer size="s" />
              <EuiPanel color="subdued" paddingSize="s" className="subFeaturePanel">
                <FeatureTableExpandedRow
                  feature={feature}
                  privilegeIndex={this.props.privilegeIndex}
                  onChange={this.props.onChange}
                  privilegeCalculator={this.props.privilegeCalculator}
                  selectedFeaturePrivileges={
                    this.props.role.kibana[this.props.privilegeIndex].feature[feature.id] ?? []
                  }
                  allSpacesSelected={this.props.allSpacesSelected}
                  disabled={this.props.disabled}
                  licenseAllowsSubFeatPrivCustomization={
                    this.props.canCustomizeSubFeaturePrivileges
                  }
                />
              </EuiPanel>
            </EuiAccordion>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };

    const primaryFeaturePrivileges = feature.getPrimaryFeaturePrivileges();

    if (feature.reserved && primaryFeaturePrivileges.length === 0) {
      const buttonContent = (
        <FeatureTableCell className="noSubFeaturePrivileges" feature={feature} />
      );

      const extraAction = (
        <EuiText style={{ maxWidth: 200 }} size={'xs'} data-test-subj="reservedFeatureDescription">
          {feature.reserved.description}
        </EuiText>
      );

      return renderFeatureMarkup(buttonContent, extraAction, <EuiIcon type="empty" />);
    }

    if (primaryFeaturePrivileges.length === 0) {
      return null;
    }

    const selectedPrivilegeId =
      this.props.privilegeCalculator.getDisplayedPrimaryFeaturePrivilegeId(
        feature.id,
        this.props.privilegeIndex,
        this.props.allSpacesSelected
      );
    const options: EuiButtonGroupOptionProps[] = primaryFeaturePrivileges
      .filter((privilege) => !privilege.disabled) // Don't show buttons for privileges that are disabled
      .map((privilege) => {
        const disabledDueToSpaceSelection =
          privilege.requireAllSpaces && !this.props.allSpacesSelected;
        return {
          id: `${feature.id}_${privilege.id}`,
          label: privilege.name,
          isDisabled: this.props.disabled || disabledDueToSpaceSelection,
        };
      });

    options.push({
      id: `${feature.id}_${NO_PRIVILEGE_VALUE}`,
      label: 'None',
      isDisabled: this.props.disabled ?? false,
    });

    let infoIcon = <EuiIconTip type="empty" content={null} />;

    const arePrivilegeControlsCollapsed = !this.state.expandedPrivilegeControls.has(feature.id);

    if (
      arePrivilegeControlsCollapsed &&
      this.props.privilegeCalculator.hasCustomizedSubFeaturePrivileges(
        feature.id,
        this.props.privilegeIndex,
        this.props.allSpacesSelected
      )
    ) {
      infoIcon = (
        <EuiIconTip
          type="iInCircle"
          content={
            <FormattedMessage
              id="xpack.security.management.editRole.featureTable.privilegeCustomizationTooltip"
              defaultMessage="Feature has customized sub-feature privileges. Expand this row for more information."
            />
          }
        />
      );
    }

    const hasSubFeaturePrivileges = feature.getSubFeaturePrivileges().length > 0;
    const buttonContent = (
      <FeatureTableCell
        className={classNames({ noSubFeaturePrivileges: !hasSubFeaturePrivileges })}
        feature={feature}
      />
    );

    const extraAction = (
      <EuiButtonGroup
        name={`featurePrivilege_${feature.id}`}
        data-test-subj={`primaryFeaturePrivilegeControl`}
        isFullWidth={true}
        options={options}
        idSelected={`${feature.id}_${selectedPrivilegeId ?? NO_PRIVILEGE_VALUE}`}
        onChange={this.onChange(feature.id)}
        legend={i18n.translate('xpack.security.management.editRole.featureTable.actionLegendText', {
          defaultMessage: '{featureName} feature privilege',
          values: {
            featureName: feature.name,
          },
        })}
        style={{
          minWidth: 200,
        }}
      />
    );

    return renderFeatureMarkup(buttonContent, extraAction, infoIcon);
  };

  private onChange = (featureId: string) => (featurePrivilegeId: string) => {
    const privilege = featurePrivilegeId.substr(`${featureId}_`.length);
    if (privilege === NO_PRIVILEGE_VALUE) {
      this.props.onChange(featureId, []);
    } else {
      this.props.onChange(featureId, [privilege]);
    }
  };

  private onChangeAllFeaturePrivileges = (privilege: string) => {
    if (privilege === NO_PRIVILEGE_VALUE) {
      this.props.onChangeAll([]);
    } else {
      this.props.onChangeAll([privilege]);
    }
  };

  private getCategoryHelpText = (category: AppCategory) => {
    if (category.id === 'management' && this.props.showAdditionalPermissionsMessage) {
      return i18n.translate(
        'xpack.security.management.editRole.featureTable.managementCategoryHelpText',
        {
          defaultMessage:
            'Additional Stack Management permissions can be found outside of this menu, in index and cluster privileges.',
        }
      );
    }
  };
}
