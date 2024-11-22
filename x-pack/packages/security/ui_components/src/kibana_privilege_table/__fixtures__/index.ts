/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonGroupProps, EuiCheckboxProps } from '@elastic/eui';
import { EuiAccordion, EuiButtonGroup, EuiCheckbox } from '@elastic/eui';
import type { ReactWrapper } from 'enzyme';

import { findTestSubject } from '@kbn/test-jest-helpers';

import { SubFeatureForm } from '../sub_feature_form';

export function getDisplayedFeaturePrivileges(wrapper: ReactWrapper<any>) {
  const categoryExpander = findTestSubject(wrapper, 'featureCategoryButton_foo');
  categoryExpander.simulate('click');

  const allExpanderButtons = findTestSubject(wrapper, 'featureTableCell');
  allExpanderButtons.forEach((button) => button.simulate('click'));

  const featurePrivilegeControls = wrapper
    .find(EuiAccordion)
    .filter('[data-test-subj="featurePrivilegeControls"]');

  return featurePrivilegeControls.reduce((acc, featureControls) => {
    const buttonGroup = featureControls
      .find(EuiButtonGroup)
      .filter('[data-test-subj="primaryFeaturePrivilegeControl"]');
    const { name, idSelected } = buttonGroup.props();
    expect(name).toBeDefined();
    expect(idSelected).toBeDefined();

    const featureId = name!.substr(`featurePrivilege_`.length);
    const primaryFeaturePrivilege = idSelected!.substr(`${featureId}_`.length);
    const subFeaturePrivileges = [];

    const subFeatureForm = featureControls.find(SubFeatureForm);
    if (subFeatureForm.length > 0) {
      const independentPrivileges = (
        subFeatureForm.find(EuiCheckbox) as ReactWrapper<EuiCheckboxProps>
      ).reduce((acc2, checkbox) => {
        const { id: privilegeId, checked } = checkbox.props();
        return checked ? [...acc2, privilegeId] : acc2;
      }, [] as string[]);

      const mutuallyExclusivePrivileges = (
        subFeatureForm.find(EuiButtonGroup) as ReactWrapper<EuiButtonGroupProps>
      ).reduce((acc2, subPrivButtonGroup) => {
        const { idSelected: selectedSubPrivilege } = subPrivButtonGroup.props();
        return selectedSubPrivilege && selectedSubPrivilege !== 'none'
          ? [...acc2, selectedSubPrivilege]
          : acc2;
      }, [] as string[]);

      subFeaturePrivileges.push(...independentPrivileges, ...mutuallyExclusivePrivileges);
    }

    return {
      ...acc,
      [featureId]: {
        ...acc[featureId],
        primaryFeaturePrivilege,
        subFeaturePrivileges,
      },
    };
  }, {} as Record<string, { primaryFeaturePrivilege: string; subFeaturePrivileges: string[] }>);
}
