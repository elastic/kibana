/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent } from '@testing-library/react';

export function getDisplayedFeaturePrivileges(container: HTMLElement) {
  const categoryExpander = container.querySelector(
    '[data-test-subj="featureCategory_foo_accordionToggle"]'
  );
  if (categoryExpander) fireEvent.click(categoryExpander);

  const allExpanderButtons = container.querySelectorAll('[data-test-subj*="_accordionToggle"]');
  allExpanderButtons.forEach((button) => {
    if (button.getAttribute('data-test-subj')?.includes('featurePrivilegeControls_')) {
      fireEvent.click(button);
    }
  });

  const featurePrivilegeControls = container.querySelectorAll(
    '[data-test-subj="featurePrivilegeControls"]'
  );

  return Array.from(featurePrivilegeControls).reduce((acc, featureControls) => {
    const childWrapper = featureControls.querySelector('[id^="featurePrivilegeControls_"]');
    const featureId = childWrapper ? childWrapper.id.replace('featurePrivilegeControls_', '') : '';
    if (!featureId) return acc;

    const primaryControl = featureControls.querySelector(
      '[data-test-subj="primaryFeaturePrivilegeControl"]'
    );
    if (!primaryControl) return acc;

    const selectedBtn = primaryControl.querySelector('[aria-pressed="true"]');
    const idSelected = selectedBtn?.getAttribute('data-test-subj') ?? '';
    const primaryFeaturePrivilege = idSelected.substring(`${featureId}_`.length);

    const subFeaturePrivileges: string[] = [];

    featureControls.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
      subFeaturePrivileges.push((cb as HTMLInputElement).id);
    });

    featureControls.querySelectorAll('[aria-pressed="true"]').forEach((btn) => {
      if (primaryControl.contains(btn)) return;
      const subId = btn.getAttribute('data-test-subj') ?? '';
      if (subId && subId !== 'none') {
        subFeaturePrivileges.push(subId);
      }
    });

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
