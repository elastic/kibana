/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, within } from '@testing-library/react';
import React from 'react';

import type { KibanaFeature, SubFeatureConfig } from '@kbn/features-plugin/public';
import type { Role } from '@kbn/security-plugin-types-common';
import {
  createFeature,
  createKibanaPrivileges,
  kibanaFeatures,
} from '@kbn/security-role-management-model/src/__fixtures__';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';

import { getDisplayedFeaturePrivileges } from './__fixtures__';
import { FeatureTable } from './feature_table';
import { PrivilegeFormCalculator } from '../privilege_form_calculator';

const createRole = (kibana: Role['kibana'] = []): Role => {
  return {
    name: 'my_role',
    elasticsearch: { cluster: [], run_as: [], indices: [] },
    kibana,
  };
};

interface TestConfig {
  features: KibanaFeature[];
  role: Role;
  privilegeIndex: number;
  calculateDisplayedPrivileges: boolean;
  canCustomizeSubFeaturePrivileges: boolean;
}

const setup = (config: TestConfig) => {
  const kibanaPrivileges = createKibanaPrivileges(config.features, {
    allowSubFeaturePrivileges: config.canCustomizeSubFeaturePrivileges,
  });

  const calculator = new PrivilegeFormCalculator(kibanaPrivileges, config.role);

  const onChange = jest.fn();
  const onChangeAll = jest.fn();
  const { container } = renderWithKibanaRenderContext(
    <FeatureTable
      role={config.role}
      privilegeCalculator={calculator}
      kibanaPrivileges={kibanaPrivileges}
      onChange={onChange}
      onChangeAll={onChangeAll}
      showAdditionalPermissionsMessage={true}
      canCustomizeSubFeaturePrivileges={config.canCustomizeSubFeaturePrivileges}
      privilegeIndex={config.privilegeIndex}
      allSpacesSelected={true}
    />
  );

  const displayedPrivileges = config.calculateDisplayedPrivileges
    ? getDisplayedFeaturePrivileges(container)
    : undefined;

  return {
    container,
    onChange,
    onChangeAll,
    displayedPrivileges,
  };
};

const getInfoIconType = (container: HTMLElement) => {
  const featureControls = container.querySelector('[data-test-subj~="featurePrivilegeControls"]');
  if (!featureControls) return 'empty';
  const accordionFlexItem = featureControls.parentElement;
  const infoIconFlexItem = accordionFlexItem?.previousElementSibling;
  const iconElement = infoIconFlexItem?.querySelector('[data-euiicon-type]');
  return iconElement?.getAttribute('data-euiicon-type') ?? 'empty';
};

describe('FeatureTable', () => {
  [true, false].forEach((canCustomizeSubFeaturePrivileges) => {
    describe(`with sub feature privileges ${
      canCustomizeSubFeaturePrivileges ? 'allowed' : 'disallowed'
    }`, () => {
      it('renders with no granted privileges for an empty role', () => {
        const role = createRole([
          {
            spaces: [],
            base: [],
            feature: {},
          },
        ]);

        const { displayedPrivileges } = setup({
          role,
          features: kibanaFeatures,
          privilegeIndex: 0,
          calculateDisplayedPrivileges: true,
          canCustomizeSubFeaturePrivileges,
        });

        expect(displayedPrivileges).toEqual({
          excluded_from_base: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
          no_sub_features: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
          with_excluded_sub_features: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
          with_sub_features: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
          with_require_all_spaces_sub_features: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
          with_require_all_spaces_for_feature_and_sub_features: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
        });
      });

      it('renders with all included privileges granted at the space when space base privilege is "all"', () => {
        const role = createRole([
          {
            spaces: ['*'],
            base: ['read'],
            feature: {},
          },
          {
            spaces: ['foo'],
            base: ['all'],
            feature: {},
          },
        ]);

        const { displayedPrivileges } = setup({
          role,
          features: kibanaFeatures,
          privilegeIndex: 1,
          calculateDisplayedPrivileges: true,
          canCustomizeSubFeaturePrivileges,
        });

        expect(displayedPrivileges).toEqual({
          excluded_from_base: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
          no_sub_features: {
            primaryFeaturePrivilege: 'all',
            subFeaturePrivileges: [],
          },
          with_excluded_sub_features: {
            primaryFeaturePrivilege: 'all',
            subFeaturePrivileges: [],
          },
          with_sub_features: {
            primaryFeaturePrivilege: 'all',
            ...(canCustomizeSubFeaturePrivileges
              ? {
                  subFeaturePrivileges: [
                    'with_sub_features_cool_toggle_1',
                    'with_sub_features_cool_toggle_2',
                    'cool_all',
                  ],
                }
              : { subFeaturePrivileges: [] }),
          },
          with_require_all_spaces_sub_features: {
            primaryFeaturePrivilege: 'all',
            ...(canCustomizeSubFeaturePrivileges
              ? { subFeaturePrivileges: ['cool_toggle_1'] }
              : { subFeaturePrivileges: [] }),
          },
          with_require_all_spaces_for_feature_and_sub_features: {
            primaryFeaturePrivilege: 'all',
            ...(canCustomizeSubFeaturePrivileges
              ? { subFeaturePrivileges: ['cool_toggle_1'] }
              : { subFeaturePrivileges: [] }),
          },
        });
      });

      it('renders the most permissive primary feature privilege when multiple are assigned', () => {
        const role = createRole([
          {
            spaces: ['*'],
            base: ['read'],
            feature: {},
          },
          {
            spaces: ['foo'],
            base: [],
            feature: {
              with_sub_features: ['read', 'minimal_all', 'all', 'minimal_read'],
            },
          },
        ]);
        const { displayedPrivileges } = setup({
          role,
          features: kibanaFeatures,
          privilegeIndex: 1,
          calculateDisplayedPrivileges: true,
          canCustomizeSubFeaturePrivileges,
        });

        expect(displayedPrivileges).toEqual({
          excluded_from_base: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
          no_sub_features: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
          with_excluded_sub_features: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
          with_sub_features: {
            primaryFeaturePrivilege: 'all',
            ...(canCustomizeSubFeaturePrivileges
              ? {
                  subFeaturePrivileges: [
                    'with_sub_features_cool_toggle_1',
                    'with_sub_features_cool_toggle_2',
                    'cool_all',
                  ],
                }
              : { subFeaturePrivileges: [] }),
          },
          with_require_all_spaces_sub_features: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
          with_require_all_spaces_for_feature_and_sub_features: {
            primaryFeaturePrivilege: 'none',
            subFeaturePrivileges: [],
          },
        });
      });

      it('allows all feature privileges to be toggled via "change all"', () => {
        const role = createRole([
          {
            spaces: ['foo'],
            base: [],
            feature: {},
          },
        ]);
        const { onChangeAll } = setup({
          role,
          features: kibanaFeatures,
          privilegeIndex: 0,
          calculateDisplayedPrivileges: false,
          canCustomizeSubFeaturePrivileges,
        });

        fireEvent.click(screen.getByTestId('changeAllPrivilegesButton'));
        fireEvent.click(screen.getByTestId('changeAllPrivileges-read'));

        expect(onChangeAll).toHaveBeenCalledWith(['read']);
      });

      it('allows all feature privileges to be unassigned via "change all"', () => {
        const role = createRole([
          {
            spaces: ['foo'],
            base: [],
            feature: {
              with_sub_features: ['all'],
              no_sub_features: ['read'],
              with_excluded_sub_features: ['all', 'something else'],
            },
          },
        ]);
        const { onChangeAll } = setup({
          role,
          features: kibanaFeatures,
          privilegeIndex: 0,
          calculateDisplayedPrivileges: false,
          canCustomizeSubFeaturePrivileges,
        });

        fireEvent.click(screen.getByTestId('changeAllPrivilegesButton'));
        fireEvent.click(screen.getByTestId('changeAllPrivileges-none'));

        expect(onChangeAll).toHaveBeenCalledWith([]);
      });
    });
  });

  it('renders the most permissive sub-feature privilege when multiple are assigned in a mutually-exclusive group', () => {
    const role = createRole([
      {
        spaces: ['*'],
        base: ['read'],
        feature: {},
      },
      {
        spaces: ['foo'],
        base: [],
        feature: {
          with_sub_features: ['minimal_read', 'cool_all', 'cool_read'],
        },
      },
    ]);

    const { displayedPrivileges } = setup({
      role,
      features: kibanaFeatures,
      privilegeIndex: 1,
      calculateDisplayedPrivileges: true,
      canCustomizeSubFeaturePrivileges: true,
    });

    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      no_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_excluded_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_sub_features: {
        primaryFeaturePrivilege: 'read',
        subFeaturePrivileges: ['cool_all'],
      },
      with_require_all_spaces_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_require_all_spaces_for_feature_and_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
    });
  });

  it('renders a row expander only for features with sub-features', () => {
    const role = createRole([
      {
        spaces: ['*'],
        base: ['read'],
        feature: {},
      },
      {
        spaces: ['foo'],
        base: [],
        feature: {},
      },
    ]);

    const { container } = setup({
      role,
      features: kibanaFeatures,
      privilegeIndex: 1,
      calculateDisplayedPrivileges: false,
      canCustomizeSubFeaturePrivileges: true,
    });

    kibanaFeatures.forEach((feature) => {
      const accordionChildren = container.querySelector(
        `[id="featurePrivilegeControls_${feature.id}"]`
      );
      if (!accordionChildren) return;

      const accordionRoot = accordionChildren.closest(
        '[data-test-subj~="featurePrivilegeControls"]'
      );
      const arrowButton = accordionRoot?.querySelector('.euiAccordion__arrow');

      if (!feature.subFeatures || feature.subFeatures.length === 0) {
        expect(arrowButton).toBeNull();
      } else {
        expect(arrowButton).not.toBeNull();
      }
    });
  });

  it('renders with sub-feature privileges granted when primary feature privilege is "all"', () => {
    const role = createRole([
      {
        spaces: ['*'],
        base: ['read'],
        feature: {
          unit_test: ['all'],
        },
      },
    ]);
    const feature = createFeature({
      id: 'unit_test',
      name: 'Unit Test Feature',
      subFeatures: [
        {
          name: 'Some Sub Feature',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-toggle-1',
                  name: 'Sub Toggle 1',
                  includeIn: 'all',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-toggle-1'],
                },
                {
                  id: 'sub-toggle-2',
                  name: 'Sub Toggle 2',
                  includeIn: 'read',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-toggle-2'],
                },
              ],
            },
            {
              groupType: 'mutually_exclusive',
              privileges: [
                {
                  id: 'sub-option-1',
                  name: 'Sub Option 1',
                  includeIn: 'all',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-option-1'],
                },
                {
                  id: 'sub-toggle-2',
                  name: 'Sub Toggle 2',
                  includeIn: 'read',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-option-2'],
                },
              ],
            },
          ],
        },
      ] as SubFeatureConfig[],
    });

    const { displayedPrivileges } = setup({
      role,
      features: [feature],
      privilegeIndex: 0,
      calculateDisplayedPrivileges: true,
      canCustomizeSubFeaturePrivileges: true,
    });
    expect(displayedPrivileges).toEqual({
      unit_test: {
        primaryFeaturePrivilege: 'all',
        subFeaturePrivileges: ['unit_test_sub-toggle-1', 'unit_test_sub-toggle-2', 'sub-option-1'],
      },
    });
  });

  it('renders with some sub-feature privileges granted when primary feature privilege is "read"', () => {
    const role = createRole([
      {
        spaces: ['*'],
        base: ['read'],
        feature: {
          unit_test: ['read'],
        },
      },
    ]);
    const feature = createFeature({
      id: 'unit_test',
      name: 'Unit Test Feature',
      subFeatures: [
        {
          name: 'Some Sub Feature',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-toggle-1',
                  name: 'Sub Toggle 1',
                  includeIn: 'all',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-toggle-1'],
                },
                {
                  id: 'sub-toggle-2',
                  name: 'Sub Toggle 2',
                  includeIn: 'read',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-toggle-2'],
                },
              ],
            },
            {
              groupType: 'mutually_exclusive',
              privileges: [
                {
                  id: 'sub-option-1',
                  name: 'Sub Option 1',
                  includeIn: 'all',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-option-1'],
                },
                {
                  id: 'sub-toggle-2',
                  name: 'Sub Toggle 2',
                  includeIn: 'read',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-option-2'],
                },
              ],
            },
          ],
        },
      ] as SubFeatureConfig[],
    });

    const { displayedPrivileges } = setup({
      role,
      features: [feature],
      privilegeIndex: 0,
      calculateDisplayedPrivileges: true,
      canCustomizeSubFeaturePrivileges: true,
    });
    expect(displayedPrivileges).toEqual({
      unit_test: {
        primaryFeaturePrivilege: 'read',
        subFeaturePrivileges: ['unit_test_sub-toggle-2', 'sub-toggle-2'],
      },
    });
  });

  it('renders with excluded sub-feature privileges not granted when primary feature privilege is "all"', () => {
    const role = createRole([
      {
        spaces: ['*'],
        base: ['read'],
        feature: {
          unit_test: ['all'],
        },
      },
    ]);
    const feature = createFeature({
      id: 'unit_test',
      name: 'Unit Test Feature',
      subFeatures: [
        {
          name: 'Some Sub Feature',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-toggle-1',
                  name: 'Sub Toggle 1',
                  includeIn: 'none',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-toggle-1'],
                },
                {
                  id: 'sub-toggle-2',
                  name: 'Sub Toggle 2',
                  includeIn: 'none',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-toggle-2'],
                },
              ],
            },
            {
              groupType: 'mutually_exclusive',
              privileges: [
                {
                  id: 'sub-option-1',
                  name: 'Sub Option 1',
                  includeIn: 'all',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-option-1'],
                },
                {
                  id: 'sub-toggle-2',
                  name: 'Sub Toggle 2',
                  includeIn: 'read',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-option-2'],
                },
              ],
            },
          ],
        },
      ] as SubFeatureConfig[],
    });

    const { displayedPrivileges } = setup({
      role,
      features: [feature],
      privilegeIndex: 0,
      calculateDisplayedPrivileges: true,
      canCustomizeSubFeaturePrivileges: true,
    });
    expect(displayedPrivileges).toEqual({
      unit_test: {
        primaryFeaturePrivilege: 'all',
        subFeaturePrivileges: ['unit_test_sub-toggle-2', 'sub-option-1'],
      },
    });
  });

  it('renders with excluded sub-feature privileges granted when explicitly assigned', () => {
    const role = createRole([
      {
        spaces: ['*'],
        base: ['read'],
        feature: {
          unit_test: ['all', 'sub-toggle-1'],
        },
      },
    ]);
    const feature = createFeature({
      id: 'unit_test',
      name: 'Unit Test Feature',
      subFeatures: [
        {
          name: 'Some Sub Feature',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-toggle-1',
                  name: 'Sub Toggle 1',
                  includeIn: 'none',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-toggle-1'],
                },
                {
                  id: 'sub-toggle-2',
                  name: 'Sub Toggle 2',
                  includeIn: 'none',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-toggle-2'],
                },
              ],
            },
            {
              groupType: 'mutually_exclusive',
              privileges: [
                {
                  id: 'sub-option-1',
                  name: 'Sub Option 1',
                  includeIn: 'all',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-option-1'],
                },
                {
                  id: 'sub-toggle-2',
                  name: 'Sub Toggle 2',
                  includeIn: 'read',
                  savedObject: { all: [], read: [] },
                  ui: ['sub-option-2'],
                },
              ],
            },
          ],
        },
      ] as SubFeatureConfig[],
    });

    const { displayedPrivileges } = setup({
      role,
      features: [feature],
      privilegeIndex: 0,
      calculateDisplayedPrivileges: true,
      canCustomizeSubFeaturePrivileges: true,
    });
    expect(displayedPrivileges).toEqual({
      unit_test: {
        primaryFeaturePrivilege: 'all',
        subFeaturePrivileges: ['unit_test_sub-toggle-1', 'unit_test_sub-toggle-2', 'sub-option-1'],
      },
    });
  });

  it('renders with all included sub-feature privileges granted at the space when primary feature privileges are granted', () => {
    const role = createRole([
      {
        spaces: ['*'],
        base: ['read'],
        feature: {},
      },
      {
        spaces: ['foo'],
        base: [],
        feature: {
          with_sub_features: ['all'],
        },
      },
    ]);
    const { displayedPrivileges } = setup({
      role,
      features: kibanaFeatures,
      privilegeIndex: 1,
      calculateDisplayedPrivileges: true,
      canCustomizeSubFeaturePrivileges: true,
    });
    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      no_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_excluded_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_sub_features: {
        primaryFeaturePrivilege: 'all',
        subFeaturePrivileges: [
          'with_sub_features_cool_toggle_1',
          'with_sub_features_cool_toggle_2',
          'cool_all',
        ],
      },
      with_require_all_spaces_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_require_all_spaces_for_feature_and_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
    });
  });

  it('renders with privileges granted when minimal feature privileges are assigned, and sub-feature privileges are disallowed', () => {
    const role = createRole([
      {
        spaces: ['foo'],
        base: [],
        feature: {
          with_sub_features: ['minimal_all'],
        },
      },
    ]);
    const { displayedPrivileges } = setup({
      role,
      features: kibanaFeatures,
      privilegeIndex: 0,
      calculateDisplayedPrivileges: true,
      canCustomizeSubFeaturePrivileges: false,
    });

    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      no_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_excluded_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_sub_features: {
        primaryFeaturePrivilege: 'all',
        subFeaturePrivileges: [],
      },
      with_require_all_spaces_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_require_all_spaces_for_feature_and_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
    });
  });

  it('renders with privileges granted when sub feature privileges are assigned, and sub-feature privileges are disallowed', () => {
    const role = createRole([
      {
        spaces: ['foo'],
        base: [],
        feature: {
          with_sub_features: ['minimal_read', 'cool_all'],
        },
      },
    ]);
    const { displayedPrivileges } = setup({
      role,
      features: kibanaFeatures,
      privilegeIndex: 0,
      calculateDisplayedPrivileges: true,
      canCustomizeSubFeaturePrivileges: false,
    });

    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      no_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_excluded_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_sub_features: {
        primaryFeaturePrivilege: 'read',
        subFeaturePrivileges: [],
      },
      with_require_all_spaces_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_require_all_spaces_for_feature_and_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
    });
  });

  it('renders a description for features with only reserved privileges (omitting the primary feature controls)', () => {
    const role = createRole([
      {
        spaces: ['foo'],
        base: [],
        feature: {},
      },
    ]);
    const reservedFeature = createFeature({
      id: 'reserved_feature',
      name: 'Reserved Feature',
      privileges: null,
      reserved: {
        description: 'this is my reserved feature description',
        privileges: [
          {
            id: 'priv_1',
            privilege: {
              api: [],
              savedObject: { all: [], read: [] },
              ui: [],
            },
          },
        ],
      },
    });

    setup({
      role,
      features: [reservedFeature],
      privilegeIndex: 0,
      calculateDisplayedPrivileges: false,
      canCustomizeSubFeaturePrivileges: false,
    });

    expect(screen.getByTestId('reservedFeatureDescription').textContent).toMatchInlineSnapshot(
      `"this is my reserved feature description"`
    );

    expect(screen.queryByTestId('primaryFeaturePrivilegeControl')).toBeNull();
  });

  it('renders subtext for features that define an optional description', () => {
    const role = createRole([
      {
        spaces: ['foo'],
        base: [],
        feature: {
          my_feature: ['all'],
        },
      },
    ]);
    const featureWithDescription = createFeature({
      id: 'my_feature',
      name: 'Some Feature',
      description: 'a description of my feature',
    });

    setup({
      role,
      features: [featureWithDescription],
      privilegeIndex: 0,
      calculateDisplayedPrivileges: false,
      canCustomizeSubFeaturePrivileges: false,
    });

    expect(screen.queryByTestId('featurePrivilegeDescriptionText')).not.toBeNull();

    expect(screen.getByTestId('featurePrivilegeDescriptionText').textContent).toMatchInlineSnapshot(
      `"a description of my feature"`
    );
  });

  it('does not render subtext for features without a description', () => {
    const role = createRole([
      {
        spaces: ['foo'],
        base: [],
        feature: {
          my_feature: ['all'],
        },
      },
    ]);
    const featureWithDescription = createFeature({
      id: 'my_feature',
      name: 'Some Feature',
    });

    setup({
      role,
      features: [featureWithDescription],
      privilegeIndex: 0,
      calculateDisplayedPrivileges: false,
      canCustomizeSubFeaturePrivileges: false,
    });

    expect(screen.queryByTestId('featurePrivilegeDescriptionText')).toBeNull();
  });

  it('renders renders the primary feature controls when both primary and reserved privileges are specified', () => {
    const role = createRole([
      {
        spaces: ['foo'],
        base: [],
        feature: {},
      },
    ]);
    const reservedFeature = createFeature({
      id: 'reserved_feature',
      name: 'Reserved Feature with primary feature privileges',
      reserved: {
        description: 'this is my reserved feature description',
        privileges: [
          {
            id: 'priv_1',
            privilege: {
              api: [],
              savedObject: { all: [], read: [] },
              ui: [],
            },
          },
        ],
      },
    });

    const { displayedPrivileges } = setup({
      role,
      features: [reservedFeature],
      privilegeIndex: 0,
      calculateDisplayedPrivileges: true,
      canCustomizeSubFeaturePrivileges: false,
    });

    expect(screen.queryByTestId('reservedFeatureDescription')).toBeNull();
    expect(displayedPrivileges).toEqual({
      reserved_feature: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
    });
  });

  it('does not render features which lack privileges', () => {
    const role = createRole([
      {
        spaces: ['foo'],
        base: [],
        feature: {},
      },
    ]);

    const featureWithoutPrivileges = createFeature({
      id: 'no_privs',
      name: 'No Privileges Feature',
      privileges: null,
    });

    const { displayedPrivileges } = setup({
      role,
      features: [...kibanaFeatures, featureWithoutPrivileges],
      privilegeIndex: 0,
      calculateDisplayedPrivileges: true,
      canCustomizeSubFeaturePrivileges: false,
    });

    expect(displayedPrivileges).toEqual({
      excluded_from_base: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      no_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_excluded_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_require_all_spaces_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
      with_require_all_spaces_for_feature_and_sub_features: {
        primaryFeaturePrivilege: 'none',
        subFeaturePrivileges: [],
      },
    });
  });

  it('renders features by category, indicating how many features are granted within', async () => {
    const role = createRole([
      {
        spaces: ['foo'],
        base: [],
        feature: {
          feature_1: ['all'],
          feature_3: ['all'],
          feature_4: ['all'],
        },
      },
    ]);

    const features = [
      createFeature({
        id: 'feature_1',
        name: 'Feature1',
        category: { id: 'foo', label: 'foo' },
      }),
      createFeature({
        id: 'feature_2',
        name: 'Feature2',
        category: { id: 'foo', label: 'foo' },
      }),
      createFeature({
        id: 'feature_3',
        name: 'Feature3',
        category: { id: 'bar', label: 'bar' },
      }),
      createFeature({
        id: 'feature_4',
        name: 'Feature4',
        category: { id: 'bar', label: 'bar' },
      }),
    ];

    setup({
      role,
      features,
      privilegeIndex: 0,
      calculateDisplayedPrivileges: false,
      canCustomizeSubFeaturePrivileges: false,
    });

    const fooCategory = screen.getByTestId('featureCategory_foo');
    const barCategory = screen.getByTestId('featureCategory_bar');

    expect(within(fooCategory).getByTestId('categoryLabel').textContent).toMatchInlineSnapshot(
      `"1 / 2 features granted"`
    );

    expect(within(barCategory).getByTestId('categoryLabel').textContent).toMatchInlineSnapshot(
      `"2 / 2 features granted"`
    );
  });

  describe('Info Icon Tooltip for Customized Subfeature privileges', () => {
    it('should render if there are custom privileges and the accordion is toggled open then toggled closed', () => {
      const role = createRole([
        {
          spaces: ['foo'],
          base: [],
          feature: {
            unit_test: ['minimal_read', 'sub-toggle-1', 'sub-toggle-2'],
          },
        },
      ]);

      const feature = createFeature({
        id: 'unit_test',
        name: 'Unit Test Feature',
        subFeatures: [
          {
            name: 'Some Sub Feature',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'sub-toggle-1',
                    name: 'Sub Toggle 1',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: ['sub-toggle-1'],
                  },
                  {
                    id: 'sub-toggle-2',
                    name: 'Sub Toggle 2',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: ['sub-toggle-2'],
                  },
                  {
                    id: 'sub-toggle-3',
                    name: 'Sub Toggle 3',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: ['sub-toggle-3'],
                  },
                ],
              },
            ],
          },
        ] as SubFeatureConfig[],
      });

      const { container } = setup({
        role,
        features: [feature],
        privilegeIndex: 0,
        calculateDisplayedPrivileges: false,
        canCustomizeSubFeaturePrivileges: true,
      });

      fireEvent.click(screen.getByTestId('featureCategoryButton_foo'));
      const featureExpander = screen.getByTestId('featureTableCell');
      fireEvent.click(featureExpander);
      fireEvent.click(featureExpander);

      expect(getInfoIconType(container)).toBe('info');
    });

    it('should render if there are custom privileges and the accordion has not been toggled (i.e. on load)', () => {
      const role = createRole([
        {
          spaces: ['foo'],
          base: [],
          feature: {
            unit_test: ['minimal_read', 'sub-toggle-1', 'sub-toggle-2'],
          },
        },
      ]);

      const feature = createFeature({
        id: 'unit_test',
        name: 'Unit Test Feature',
        subFeatures: [
          {
            name: 'Some Sub Feature',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'sub-toggle-1',
                    name: 'Sub Toggle 1',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: ['sub-toggle-1'],
                  },
                  {
                    id: 'sub-toggle-2',
                    name: 'Sub Toggle 2',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: ['sub-toggle-2'],
                  },
                  {
                    id: 'sub-toggle-3',
                    name: 'Sub Toggle 3',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: ['sub-toggle-3'],
                  },
                ],
              },
            ],
          },
        ] as SubFeatureConfig[],
      });

      const { container } = setup({
        role,
        features: [feature],
        privilegeIndex: 0,
        calculateDisplayedPrivileges: false,
        canCustomizeSubFeaturePrivileges: true,
      });

      expect(getInfoIconType(container)).toBe('info');
    });

    it('should not render if there are custom privileges and the accordion is open', () => {
      const role = createRole([
        {
          spaces: ['foo'],
          base: [],
          feature: {
            unit_test: ['minimal_read', 'sub-toggle-1', 'sub-toggle-2'],
          },
        },
      ]);

      const feature = createFeature({
        id: 'unit_test',
        name: 'Unit Test Feature',
        subFeatures: [
          {
            name: 'Some Sub Feature',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'sub-toggle-1',
                    name: 'Sub Toggle 1',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: ['sub-toggle-1'],
                  },
                  {
                    id: 'sub-toggle-2',
                    name: 'Sub Toggle 2',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: ['sub-toggle-2'],
                  },
                  {
                    id: 'sub-toggle-3',
                    name: 'Sub Toggle 3',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: ['sub-toggle-3'],
                  },
                ],
              },
            ],
          },
        ] as SubFeatureConfig[],
      });

      const { container } = setup({
        role,
        features: [feature],
        privilegeIndex: 0,
        calculateDisplayedPrivileges: false,
        canCustomizeSubFeaturePrivileges: true,
      });

      fireEvent.click(screen.getByTestId('featureCategoryButton_foo'));
      fireEvent.click(screen.getByTestId('featureTableCell'));

      expect(getInfoIconType(container)).toBe('empty');
    });

    it('should not render if there are NOT custom privileges and the accordion has not been toggled (i.e on load)', () => {
      const role = createRole([
        {
          spaces: ['foo'],
          base: [],
          feature: {
            unit_test: ['all', 'sub-toggle-1', 'sub-toggle-2', 'sub-toggle-3'],
          },
        },
      ]);

      const feature = createFeature({
        id: 'unit_test',
        name: 'Unit Test Feature',
        subFeatures: [
          {
            name: 'Some Sub Feature',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'sub-toggle-1',
                    name: 'Sub Toggle 1',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: ['sub-toggle-1'],
                  },
                  {
                    id: 'sub-toggle-2',
                    name: 'Sub Toggle 2',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: ['sub-toggle-2'],
                  },
                  {
                    id: 'sub-toggle-3',
                    name: 'Sub Toggle 3',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: ['sub-toggle-3'],
                  },
                ],
              },
            ],
          },
        ] as SubFeatureConfig[],
      });

      const { container } = setup({
        role,
        features: [feature],
        privilegeIndex: 0,
        calculateDisplayedPrivileges: false,
        canCustomizeSubFeaturePrivileges: true,
      });

      expect(getInfoIconType(container)).toBe('empty');
    });

    it('should not render if there are NOT custom privileges and the accordion has been toggled open then toggled closed', () => {
      const role = createRole([
        {
          spaces: ['foo'],
          base: [],
          feature: {
            unit_test: ['all', 'sub-toggle-1', 'sub-toggle-2', 'sub-toggle-3'],
          },
        },
      ]);

      const feature = createFeature({
        id: 'unit_test',
        name: 'Unit Test Feature',
        subFeatures: [
          {
            name: 'Some Sub Feature',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'sub-toggle-1',
                    name: 'Sub Toggle 1',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: ['sub-toggle-1'],
                  },
                  {
                    id: 'sub-toggle-2',
                    name: 'Sub Toggle 2',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: ['sub-toggle-2'],
                  },
                  {
                    id: 'sub-toggle-3',
                    name: 'Sub Toggle 3',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: ['sub-toggle-3'],
                  },
                ],
              },
            ],
          },
        ] as SubFeatureConfig[],
      });

      const { container } = setup({
        role,
        features: [feature],
        privilegeIndex: 0,
        calculateDisplayedPrivileges: false,
        canCustomizeSubFeaturePrivileges: true,
      });

      fireEvent.click(screen.getByTestId('featureCategoryButton_foo'));
      const featureExpander = screen.getByTestId('featureTableCell');
      fireEvent.click(featureExpander);
      fireEvent.click(featureExpander);

      expect(getInfoIconType(container)).toBe('empty');
    });
  });
  describe('Optional description for sub-features', () => {
    const role = createRole([
      {
        spaces: ['foo'],
        base: [],
        feature: {
          unit_test: ['minimal_read', 'sub-toggle-1', 'sub-toggle-2'],
        },
      },
    ]);

    it('renders description subtext if defined', () => {
      const feature = createFeature({
        id: 'unit_test',
        name: 'Unit Test Feature',
        subFeatures: [
          {
            name: 'Some Sub Feature',
            description: 'some sub feature description',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'sub-toggle-1',
                    name: 'Sub Toggle 1',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: ['sub-toggle-1'],
                  },
                ],
              },
            ],
          },
        ] as SubFeatureConfig[],
      });
      setup({
        role,
        features: [feature],
        privilegeIndex: 0,
        calculateDisplayedPrivileges: false,
        canCustomizeSubFeaturePrivileges: true,
      });

      fireEvent.click(screen.getByTestId('featureCategoryButton_foo'));
      fireEvent.click(screen.getByTestId('featureTableCell'));

      expect(screen.queryByTestId('subFeatureDescription')).not.toBeNull();
      expect(screen.getByTestId('subFeatureDescription').textContent).toMatchInlineSnapshot(
        `"some sub feature description"`
      );
    });
    it('should not render description subtext if undefined', () => {
      const feature = createFeature({
        id: 'unit_test',
        name: 'Unit Test Feature',
        subFeatures: [
          {
            name: 'Some Sub Feature',
            privilegeGroups: [
              {
                groupType: 'independent',
                privileges: [
                  {
                    id: 'sub-toggle-1',
                    name: 'Sub Toggle 1',
                    includeIn: 'all',
                    savedObject: { all: [], read: [] },
                    ui: ['sub-toggle-1'],
                  },
                ],
              },
            ],
          },
        ] as SubFeatureConfig[],
      });
      setup({
        role,
        features: [feature],
        privilegeIndex: 0,
        calculateDisplayedPrivileges: false,
        canCustomizeSubFeaturePrivileges: true,
      });

      fireEvent.click(screen.getByTestId('featureCategoryButton_foo'));
      fireEvent.click(screen.getByTestId('featureTableCell'));

      expect(screen.queryByTestId('subFeatureDescription')).toBeNull();
    });
  });
});
