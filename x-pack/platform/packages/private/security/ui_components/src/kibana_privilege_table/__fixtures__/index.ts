/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent } from '@testing-library/react';

export function getDisplayedFeaturePrivileges(container: HTMLElement) {
  const categoryExpander = container.querySelector('[data-test-subj~="featureCategoryButton_foo"]');
  if (categoryExpander) fireEvent.click(categoryExpander);

  const allExpanderButtons = container.querySelectorAll('[data-test-subj~="featureTableCell"]');
  allExpanderButtons.forEach((button) => fireEvent.click(button));

  const featurePrivilegeControls = container.querySelectorAll(
    '[data-test-subj~="featurePrivilegeControls"]'
  );

  return Array.from(featurePrivilegeControls).reduce((acc, featureControls) => {
    const idElement = featureControls.querySelector('[id^="featurePrivilegeControls_"]');
    const featureId = idElement
      ? idElement.id.replace('featurePrivilegeControls_', '').replace(/--.*/, '')
      : '';

    if (!featureId) return acc;

    const primaryGroup = featureControls.querySelector(
      '[data-test-subj~="primaryFeaturePrivilegeControl"]'
    );
    // EUI EuiButtonGroupButton stores option id as data-test-subj, not as HTML id
    const selectedPrimaryBtn = primaryGroup?.querySelector('[aria-pressed="true"]');
    const idSelected = selectedPrimaryBtn?.getAttribute('data-test-subj');
    expect(idSelected).toBeDefined();

    const primaryFeaturePrivilege = idSelected
      ? idSelected.substring(`${featureId}_`.length)
      : 'none';
    const subFeaturePrivileges: string[] = [];

    // EUI EuiCheckbox puts data-test-subj on the <input> element itself via ...rest
    const checkedCheckboxes = featureControls.querySelectorAll(
      'input[type="checkbox"][data-test-subj~="independentSubFeaturePrivilegeControl"]:checked'
    );
    checkedCheckboxes.forEach((checkbox) => {
      subFeaturePrivileges.push(checkbox.id);
    });

    const subGroups = featureControls.querySelectorAll(
      '[data-test-subj~="mutexSubFeaturePrivilegeControl"]'
    );
    subGroups.forEach((group) => {
      const selectedBtn = group.querySelector('[aria-pressed="true"]');
      const selectedId = selectedBtn?.getAttribute('data-test-subj') ?? '';
      if (selectedId && selectedId !== 'none') {
        subFeaturePrivileges.push(selectedId);
      }
    });

    return {
      ...acc,
      [featureId]: {
        primaryFeaturePrivilege,
        subFeaturePrivileges,
      },
    };
  }, {} as Record<string, { primaryFeaturePrivilege: string; subFeaturePrivileges: string[] }>);
}
