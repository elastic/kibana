/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import { POCPrivilegeCalculator } from 'plugins/security/lib/poc_privilege_calculator/poc_privilege_calculator';
import { IFeature } from '../../../../../../../../../../../plugins/features/common';
import { Role } from '../../../../../../../../common/model';
import { SubFeatureForm } from './sub_feature_form';

interface Props {
  feature: IFeature;
  role: Role;
  spacesIndex: number;
  privilegeCalculator: POCPrivilegeCalculator;
  disabled?: boolean;
  onChange: (featureId: string, featurePrivileges: string[]) => void;
}

export const FeatureTableExpandedRow = ({
  feature,
  role,
  spacesIndex,
  onChange,
  privilegeCalculator,
  disabled,
}: Props) => {
  const { id, privileges = [], subFeatures = [] } = feature;
  const selectedPrivileges = role.kibana[spacesIndex].feature[id] ?? [];

  const selectedPrimaryFeaturePrivileges = selectedPrivileges.filter(sp =>
    privileges.some(featurePrivilege => sp === featurePrivilege.id)
  );

  const privilegeExplanations = privilegeCalculator.explainEffectiveFeaturePrivileges(
    role,
    spacesIndex,
    feature.id
  );

  // TODO: externalize
  const isMinimumFeaturePrivilege = (privilege: string) => privilege.startsWith('minimum_');
  const getMinimumFeaturePrivilege = (privilege: string) =>
    isMinimumFeaturePrivilege(privilege) ? privilege : `minimum_${privilege}`;

  const getRegularFeaturePrivilege = (privilege: string) =>
    isMinimumFeaturePrivilege(privilege) ? privilege.substr(`minimum_`.length) : privilege;

  const onCustomizeSubFeatureChange = (e: EuiSwitchEvent) => {
    const customizeSubFeatures = e.target.checked;

    const selectedPrimaryFeaturePrivilege = selectedPrimaryFeaturePrivileges[0];

    if (!selectedPrimaryFeaturePrivilege) {
      return;
    }

    const updatedSelectedPrivileges = selectedPrivileges.filter(
      sp => sp !== selectedPrimaryFeaturePrivilege
    );

    if (customizeSubFeatures) {
      updatedSelectedPrivileges.push(getMinimumFeaturePrivilege(selectedPrimaryFeaturePrivilege));
    } else {
      updatedSelectedPrivileges.push(getRegularFeaturePrivilege(selectedPrimaryFeaturePrivilege));
    }

    console.log({
      feature: feature.id,
      customizeSubFeatures,
      selectedPrimaryFeaturePrivileges,
      updatedSelectedPrivileges,
    });

    onChange(feature.id, updatedSelectedPrivileges);
  };

  const isCustomizingSubFeaturePrivileges = selectedPrimaryFeaturePrivileges.every(sp =>
    isMinimumFeaturePrivilege(sp)
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiSwitch
          label="Customize sub-feature privileges"
          checked={isCustomizingSubFeaturePrivileges}
          onChange={onCustomizeSubFeatureChange}
          disabled={disabled}
        />
      </EuiFlexItem>
      {subFeatures.map(subFeature => {
        return (
          <EuiFlexItem key={subFeature.name}>
            <SubFeatureForm
              featureId={feature.id}
              subFeature={subFeature}
              onChange={updatedPrivileges => onChange(id, updatedPrivileges)}
              selectedPrivileges={selectedPrivileges}
              privilegeExplanations={privilegeExplanations}
              disabled={disabled}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
