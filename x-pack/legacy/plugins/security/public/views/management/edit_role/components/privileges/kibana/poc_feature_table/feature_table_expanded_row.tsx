/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSwitch } from '@elastic/eui';
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
  const { id, subFeatures = [] } = feature;
  const selectedPrivileges = role.kibana[spacesIndex].feature[id] ?? [];

  const privilegeExplanations = privilegeCalculator.explainEffectiveFeaturePrivileges(
    role,
    spacesIndex,
    feature.id
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiSwitch
          label="Customize sub-feature privileges"
          checked={false}
          onChange={() => null}
          disabled={disabled}
        />
      </EuiFlexItem>
      {subFeatures.map(subFeature => {
        return (
          <EuiFlexItem key={subFeature.name}>
            <SubFeatureForm
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
