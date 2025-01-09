/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import type {
  SecuredFeature,
  SecuredSubFeature,
  SubFeaturePrivilege,
  SubFeaturePrivilegeGroup,
} from '@kbn/security-role-management-model';

import type { EffectiveFeaturePrivileges } from './privilege_summary_calculator';
import { ALL_SPACES_ID } from '../../../../../../../common/constants';

type EffectivePrivilegesTuple = [string[], EffectiveFeaturePrivileges['featureId']];

interface Props {
  feature: SecuredFeature;
  effectiveFeaturePrivileges: EffectivePrivilegesTuple[];
}

export const PrivilegeSummaryExpandedRow = (props: Props) => {
  const allSpacesEffectivePrivileges = useMemo(
    () => props.effectiveFeaturePrivileges.find(([spaces]) => spaces.includes(ALL_SPACES_ID)),
    [props.effectiveFeaturePrivileges]
  );

  const renderIndependentPrivilegeGroup = useCallback(
    (
      effectiveSubFeaturePrivileges: string[],
      privilegeGroup: SubFeaturePrivilegeGroup,
      index: number
    ) => {
      return (
        <div key={index}>
          {privilegeGroup.privileges.map((privilege: SubFeaturePrivilege) => {
            const isGranted = effectiveSubFeaturePrivileges.includes(privilege.id);
            return (
              <EuiFlexGroup gutterSize="s" data-test-subj="independentPrivilege" key={privilege.id}>
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    type={isGranted ? 'check' : 'cross'}
                    color={isGranted ? 'primary' : 'danger'}
                    content={
                      isGranted
                        ? i18n.translate(
                            'xpack.security.management.editRole.privilegeSummary.privilegeGrantedIconTip',
                            { defaultMessage: 'Privilege is granted' }
                          )
                        : i18n.translate(
                            'xpack.security.management.editRole.privilegeSummary.privilegeNotGrantedIconTip',
                            { defaultMessage: 'Privilege is not granted' }
                          )
                    }
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s" data-test-subj="privilegeName">
                    {privilege.name}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          })}
        </div>
      );
    },
    []
  );

  const renderMutuallyExclusivePrivilegeGroup = useCallback(
    (
      effectiveSubFeaturePrivileges: string[],
      privilegeGroup: SubFeaturePrivilegeGroup,
      index: number,
      isDisabledDueToSpaceSelection: boolean
    ) => {
      const firstSelectedPrivilege = !isDisabledDueToSpaceSelection
        ? privilegeGroup.privileges.find((p) => effectiveSubFeaturePrivileges.includes(p.id))?.name
        : null;

      return (
        <EuiFlexGroup gutterSize="s" key={index} data-test-subj="mutexPrivilege">
          <EuiFlexItem grow={false}>
            <EuiIconTip
              type={firstSelectedPrivilege ? 'check' : 'cross'}
              color={firstSelectedPrivilege ? 'primary' : 'danger'}
              content={firstSelectedPrivilege ? 'Privilege is granted' : 'Privilege is not granted'}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" data-test-subj="privilegeName">
              {firstSelectedPrivilege ?? 'None'}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    []
  );

  const renderPrivilegeGroup = useCallback(
    (
      effectiveSubFeaturePrivileges: string[],
      { requireAllSpaces, spaces }: { requireAllSpaces: boolean; spaces: string[] }
    ) => {
      return (privilegeGroup: SubFeaturePrivilegeGroup, index: number) => {
        const isDisabledDueToSpaceSelection = requireAllSpaces && !spaces.includes(ALL_SPACES_ID);

        switch (privilegeGroup.groupType) {
          case 'independent':
            return renderIndependentPrivilegeGroup(
              effectiveSubFeaturePrivileges,
              privilegeGroup,
              index
            );
          case 'mutually_exclusive':
            return renderMutuallyExclusivePrivilegeGroup(
              effectiveSubFeaturePrivileges,
              privilegeGroup,
              index,
              isDisabledDueToSpaceSelection
            );
          default:
            throw new Error(`Unsupported privilege group type: ${privilegeGroup.groupType}`);
        }
      };
    },
    [renderIndependentPrivilegeGroup, renderMutuallyExclusivePrivilegeGroup]
  );

  const getEffectiveFeaturePrivileges = useCallback(
    (subFeature: SecuredSubFeature) => {
      return props.effectiveFeaturePrivileges.map((entry, index) => {
        const [spaces, privs] =
          subFeature.requireAllSpaces && allSpacesEffectivePrivileges
            ? allSpacesEffectivePrivileges
            : entry;

        return (
          <EuiFlexItem key={index} data-test-subj={`entry-${index}`}>
            {subFeature.getPrivilegeGroups().map(
              renderPrivilegeGroup(privs.subFeature, {
                requireAllSpaces: subFeature.requireAllSpaces,
                spaces,
              })
            )}
          </EuiFlexItem>
        );
      });
    },
    [props.effectiveFeaturePrivileges, allSpacesEffectivePrivileges, renderPrivilegeGroup]
  );

  return (
    <EuiFlexGroup direction="column">
      {props.feature.getSubFeatures().map((subFeature) => {
        return (
          <EuiFlexItem key={subFeature.name} data-test-subj="subFeatureEntry">
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiText size="s" data-test-subj="subFeatureName">
                  {subFeature.name}
                </EuiText>
              </EuiFlexItem>
              {getEffectiveFeaturePrivileges(subFeature)}
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
