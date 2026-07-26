/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent } from '@testing-library/react';

import type { Role, RoleKibanaPrivilege } from '../../../../../../../../common';

interface DisplayedFeaturePrivileges {
  [featureId: string]: {
    [spaceGroup: string]: {
      primaryFeaturePrivilege: string;
      subFeaturesPrivileges: {
        [subFeatureName: string]: string[];
      };
      hasCustomizedSubFeaturePrivileges: boolean;
    };
  };
}

const getSpaceKey = (entry: RoleKibanaPrivilege) => entry.spaces.join(', ');

export function getDisplayedFeaturePrivileges(
  container: HTMLElement,
  role: Role
): DisplayedFeaturePrivileges {
  const allExpanderButtons = container.querySelectorAll(
    '[data-test-subj="expandPrivilegeSummaryRow"]'
  );
  allExpanderButtons.forEach((button) => fireEvent.click(button));

  const allRows = Array.from(container.querySelectorAll('table tbody tr'));

  let currentFeatureId = '';

  return allRows.reduce((acc, row) => {
    const testSubj = row.getAttribute('data-test-subj') ?? '';

    if (testSubj.startsWith('summaryTableRow-')) {
      currentFeatureId = testSubj.replace('summaryTableRow-', '');

      const privilegeColumns = row.querySelectorAll('[data-test-subj~="privilegeColumn"]');

      expect(privilegeColumns).toHaveLength(role.kibana.length);

      acc[currentFeatureId] = acc[currentFeatureId] ?? {};

      privilegeColumns.forEach((primary, index) => {
        const key = getSpaceKey(role.kibana[index]);

        acc[currentFeatureId][key] = {
          ...acc[currentFeatureId][key],
          primaryFeaturePrivilege: (primary.textContent ?? '').replaceAll('Info', '').trim(),
          hasCustomizedSubFeaturePrivileges:
            primary.getAttribute('data-test-subj')?.includes('additionalPrivilegesGranted') ??
            false,
        };
      });
    } else if (row.querySelector('[data-test-subj="subFeatureEntry"]')) {
      getDisplayedSubFeaturePrivileges(acc, row, currentFeatureId, role);
    }

    return acc;
  }, {} as DisplayedFeaturePrivileges);
}

function getDisplayedSubFeaturePrivileges(
  displayedFeatures: DisplayedFeaturePrivileges,
  expandedRow: Element,
  featureId: string,
  role: Role
) {
  const subFeatureEntries = expandedRow.querySelectorAll('[data-test-subj="subFeatureEntry"]');

  displayedFeatures[featureId] = displayedFeatures[featureId] ?? {};

  subFeatureEntries.forEach((subFeatureEntry) => {
    const subFeatureName =
      subFeatureEntry.querySelector('[data-test-subj="subFeatureName"]')?.textContent ?? '';

    const entryElements = subFeatureEntry.querySelectorAll('[data-test-subj|="entry"]');

    expect(entryElements).toHaveLength(role.kibana.length);

    role.kibana.forEach((entry, index) => {
      const key = getSpaceKey(entry);
      const element = expandedRow.querySelector(`[data-test-subj="entry-${index}"]`);
      if (!element) return;

      const independentPrivileges = Array.from(
        element.querySelectorAll('[data-test-subj="independentPrivilege"]')
      ).reduce((acc2, flexGroup) => {
        const privilegeName =
          flexGroup.querySelector('[data-test-subj="privilegeName"]')?.textContent ?? '';
        const isGranted = !!flexGroup.querySelector('[data-euiicon-type="check"]');
        return isGranted ? [...acc2, privilegeName] : acc2;
      }, [] as string[]);

      const mutuallyExclusivePrivileges = Array.from(
        element.querySelectorAll('[data-test-subj="mutexPrivilege"]')
      ).reduce((acc2, flexGroup) => {
        const privilegeName =
          flexGroup.querySelector('[data-test-subj="privilegeName"]')?.textContent ?? '';
        const isGranted = !!flexGroup.querySelector('[data-euiicon-type="check"]');
        return isGranted ? [...acc2, privilegeName] : acc2;
      }, [] as string[]);

      displayedFeatures[featureId][key] = {
        ...displayedFeatures[featureId][key],
        subFeaturesPrivileges: {
          ...displayedFeatures[featureId][key].subFeaturesPrivileges,
          [subFeatureName]: [...independentPrivileges, ...mutuallyExclusivePrivileges],
        },
      };
    });
  });
}
