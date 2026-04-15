/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { KibanaFeature } from '@kbn/features-plugin/public';
import type { Role, RoleKibanaPrivilege } from '@kbn/security-plugin-types-common';
import { createKibanaPrivileges } from '@kbn/security-role-management-model/src/__fixtures__';
import { PrivilegeFormCalculator } from '@kbn/security-ui-components';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { PrivilegeSpaceTable } from './privilege_space_table';

interface TableRow {
  spaces: string[];
  privileges: {
    summary: string;
    overridden: boolean;
  };
}

const features = [
  new KibanaFeature({
    id: 'normal',
    name: 'normal feature',
    app: [],
    category: { id: 'foo', label: 'foo' },
    privileges: {
      all: {
        savedObject: { all: [], read: [] },
        ui: ['normal-feature-all', 'normal-feature-read'],
      },
      read: {
        savedObject: { all: [], read: [] },
        ui: ['normal-feature-read'],
      },
    },
  }),
  new KibanaFeature({
    id: 'normal_with_sub',
    name: 'normal feature with sub features',
    app: [],
    category: { id: 'foo', label: 'foo' },
    privileges: {
      all: {
        savedObject: { all: [], read: [] },
        ui: ['normal-feature-all', 'normal-feature-read'],
      },
      read: {
        savedObject: { all: [], read: [] },
        ui: ['normal-feature-read'],
      },
    },
    subFeatures: [
      {
        name: 'sub feature',
        privilegeGroups: [
          {
            groupType: 'mutually_exclusive',
            privileges: [
              {
                id: 'normal_sub_all',
                name: 'normal sub feature privilege',
                includeIn: 'all',
                savedObject: { all: [], read: [] },
                ui: ['normal-sub-all', 'normal-sub-read'],
              },
              {
                id: 'normal_sub_read',
                name: 'normal sub feature read privilege',
                includeIn: 'read',
                savedObject: { all: [], read: [] },
                ui: ['normal-sub-read'],
              },
            ],
          },
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'excluded_sub_priv',
                name: 'excluded sub feature privilege',
                includeIn: 'none',
                savedObject: { all: [], read: [] },
                ui: ['excluded-sub-priv'],
              },
            ],
          },
        ],
      },
    ],
  }),
  new KibanaFeature({
    id: 'bothPrivilegesExcludedFromBase',
    name: 'bothPrivilegesExcludedFromBase',
    app: [],
    category: { id: 'foo', label: 'foo' },
    privileges: {
      all: {
        excludeFromBasePrivileges: true,
        savedObject: { all: [], read: [] },
        ui: ['both-privileges-excluded-from-base-all', 'both-privileges-excluded-from-base-read'],
      },
      read: {
        excludeFromBasePrivileges: true,
        savedObject: { all: [], read: [] },
        ui: ['both-privileges-excluded-from-base-read'],
      },
    },
  }),
  new KibanaFeature({
    id: 'allPrivilegeExcludedFromBase',
    name: 'allPrivilegeExcludedFromBase',
    app: [],
    category: { id: 'foo', label: 'foo' },
    privileges: {
      all: {
        excludeFromBasePrivileges: true,
        savedObject: { all: [], read: [] },
        ui: ['all-privilege-excluded-from-base-all', 'all-privilege-excluded-from-base-read'],
      },
      read: {
        savedObject: { all: [], read: [] },
        ui: ['all-privilege-excluded-from-base-read'],
      },
    },
  }),
];

const buildProps = (roleKibanaPrivileges: RoleKibanaPrivilege[]): PrivilegeSpaceTable['props'] => {
  const kibanaPrivileges = createKibanaPrivileges(features);
  const role = {
    name: 'test role',
    elasticsearch: {
      cluster: ['all'],
      indices: [] as any[],
      run_as: [] as string[],
    },
    kibana: roleKibanaPrivileges,
  };
  return {
    role,
    privilegeCalculator: new PrivilegeFormCalculator(kibanaPrivileges, role),
    onChange: (r: Role) => {},
    onEdit: (spacesIndex: number) => {},
    displaySpaces: [
      {
        id: 'default',
        name: 'Default',
        description: '',
        disabledFeatures: [],
        _reserved: true,
      },
      {
        id: 'marketing',
        name: 'Marketing',
        description: '',
        disabledFeatures: [],
      },
    ],
  };
};

const getTableFromContainer = (container: HTMLElement): TableRow[] => {
  const rows = container.querySelectorAll('table tbody tr');
  return Array.from(rows).map((row) => {
    const cells = row.querySelectorAll('td');
    const spacesColumn = cells[0].querySelector('[data-test-subj="spacesColumn"]');
    const spaces = spacesColumn
      ? Array.from(spacesColumn.children).map((el) => el.textContent?.trim() ?? '')
      : [];

    const privilegeEl = cells[1].querySelector('[data-test-subj="privilegeColumn"]');
    const summary = privilegeEl?.textContent?.trim() ?? '';
    const overridden = !!row.querySelector(
      '[data-test-subj="spaceTablePrivilegeSupersededWarning"]'
    );

    return {
      spaces,
      privileges: { summary, overridden },
    };
  });
};

describe('only global', () => {
  it('base all', () => {
    const props = buildProps([{ spaces: ['*'], base: ['all'], feature: {} }]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
    ]);
  });

  it('base *', () => {
    const props = buildProps([{ spaces: ['*'], base: ['*'], feature: {} }]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: '*', overridden: false } },
    ]);
  });

  it('base read', () => {
    const props = buildProps([{ spaces: ['*'], base: ['read'], feature: {} }]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
    ]);
  });

  it('normal feature privilege all', () => {
    const props = buildProps([{ spaces: ['*'], base: [], feature: { normal: ['all'] } }]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('normal feature privilege read', () => {
    const props = buildProps([{ spaces: ['*'], base: [], feature: { normal: ['read'] } }]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('normal feature privilege minimal_all', () => {
    const props = buildProps([
      { spaces: ['*'], base: [], feature: { normal_with_sub: ['minimal_all'] } },
    ]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('normal feature privilege minimal_all and normal_sub_read', () => {
    const props = buildProps([
      { spaces: ['*'], base: [], feature: { normal_with_sub: ['minimal_all', 'normal_sub_read'] } },
    ]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('bothPrivilegesExcludedFromBase feature privilege all', () => {
    const props = buildProps([
      { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
    ]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('bothPrivilegesExcludedFromBase feature privilege read', () => {
    const props = buildProps([
      { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
    ]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('allPrivilegeExcludedFromBase feature privilege all', () => {
    const props = buildProps([
      { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
    ]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('allPrivilegeExcludedFromBase feature privilege read', () => {
    const props = buildProps([
      { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
    ]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });
});

describe('only default and marketing space', () => {
  it('base all', () => {
    const props = buildProps([{ spaces: ['default', 'marketing'], base: ['all'], feature: {} }]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
    ]);
  });

  it('base read', () => {
    const props = buildProps([{ spaces: ['default', 'marketing'], base: ['read'], feature: {} }]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: false } },
    ]);
  });

  it('normal feature privilege all', () => {
    const props = buildProps([
      { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
    ]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('normal feature privilege read', () => {
    const props = buildProps([
      { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
    ]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('normal feature privilege minimal_all', () => {
    const props = buildProps([
      { spaces: ['default', 'marketing'], base: [], feature: { normal_with_sub: ['minimal_all'] } },
    ]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('normal feature privilege minimal_all and normal_sub_read', () => {
    const props = buildProps([
      {
        spaces: ['default', 'marketing'],
        base: [],
        feature: { normal_with_sub: ['minimal_all', 'normal_sub_read'] },
      },
    ]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('bothPrivilegesExcludedFromBase feature privilege all', () => {
    const props = buildProps([
      {
        spaces: ['default', 'marketing'],
        base: [],
        feature: { bothPrivilegesExcludedFromBase: ['all'] },
      },
    ]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('bothPrivilegesExcludedFromBase feature privilege read', () => {
    const props = buildProps([
      {
        spaces: ['default', 'marketing'],
        base: [],
        feature: { bothPrivilegesExcludedFromBase: ['read'] },
      },
    ]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('allPrivilegeExcludedFromBase feature privilege all', () => {
    const props = buildProps([
      {
        spaces: ['default', 'marketing'],
        base: [],
        feature: { allPrivilegeExcludedFromBase: ['all'] },
      },
    ]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('allPrivilegeExcludedFromBase feature privilege read', () => {
    const props = buildProps([
      {
        spaces: ['default', 'marketing'],
        base: [],
        feature: { allPrivilegeExcludedFromBase: ['read'] },
      },
    ]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });
});

describe('global base all', () => {
  describe('default and marketing space', () => {
    it('base all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        { spaces: ['default', 'marketing'], base: ['all'], feature: {} },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
      ]);
    });

    it('base read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        { spaces: ['default', 'marketing'], base: ['read'], feature: {} },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: true } },
      ]);
    });

    it('normal feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('normal feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: true } },
      ]);
    });

    it('normal feature privilege minimal_all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { normal_with_sub: ['minimal_all'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: true } },
      ]);
    });

    it('normal feature privilege minimal_all and normal_sub_read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { normal_with_sub: ['minimal_all', 'normal_sub_read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: true } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['all'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['all'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });
  });
});

describe('global base read', () => {
  describe('default and marketing space', () => {
    it('base all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        { spaces: ['default', 'marketing'], base: ['all'], feature: {} },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
      ]);
    });

    it('base read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        { spaces: ['default', 'marketing'], base: ['read'], feature: {} },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: false } },
      ]);
    });

    it('normal feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('normal feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('normal feature privilege minimal_read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { normal_with_sub: ['minimal_read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: true } },
      ]);
    });

    it('normal feature privilege minimal_read and normal_sub_read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { normal_with_sub: ['minimal_read', 'normal_sub_read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['all'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['all'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });
  });
});

describe('global and reserved', () => {
  it('base all, reserved_foo', () => {
    const props = buildProps([
      { spaces: ['*'], base: ['all'], feature: {} },
      { spaces: ['*'], base: [], feature: {}, _reserved: ['foo'] },
    ]);
    const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromContainer(container);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Foo', overridden: false } },
      { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
    ]);
  });
});

describe('global normal feature privilege all', () => {
  describe('default and marketing space', () => {
    it('base all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['all'] } },
        { spaces: ['default', 'marketing'], base: ['all'], feature: {} },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
      ]);
    });

    it('base read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['all'] } },
        { spaces: ['default', 'marketing'], base: ['read'], feature: {} },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: false } },
      ]);
    });

    it('normal feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['all'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('normal feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['all'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: true } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['all'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['all'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });
  });
});

describe('global normal feature privilege read', () => {
  describe('default and marketing space', () => {
    it('base all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['read'] } },
        { spaces: ['default', 'marketing'], base: ['all'], feature: {} },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
      ]);
    });

    it('base read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['read'] } },
        { spaces: ['default', 'marketing'], base: ['read'], feature: {} },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: false } },
      ]);
    });

    it('normal feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['read'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('normal feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['read'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['all'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['all'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });
  });
});

describe('global bothPrivilegesExcludedFromBase feature privilege all', () => {
  describe('default and marketing space', () => {
    it('base all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['all'] } },
        { spaces: ['default', 'marketing'], base: ['all'], feature: {} },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
      ]);
    });

    it('base read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['all'] } },
        { spaces: ['default', 'marketing'], base: ['read'], feature: {} },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: false } },
      ]);
    });

    it('normal feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['all'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('normal feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['all'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['all'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: true } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['all'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });
  });
});

describe('global bothPrivilegesExcludedFromBase feature privilege read', () => {
  describe('default and marketing space', () => {
    it('base all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
        { spaces: ['default', 'marketing'], base: ['all'], feature: {} },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
      ]);
    });

    it('base read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
        { spaces: ['default', 'marketing'], base: ['read'], feature: {} },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: false } },
      ]);
    });

    it('normal feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('normal feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['all'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['all'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });
  });
});

describe('global allPrivilegeExcludedFromBase feature privilege all', () => {
  describe('default and marketing space', () => {
    it('base all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['all'] } },
        { spaces: ['default', 'marketing'], base: ['all'], feature: {} },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
      ]);
    });

    it('base read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['all'] } },
        { spaces: ['default', 'marketing'], base: ['read'], feature: {} },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: false } },
      ]);
    });

    it('normal feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['all'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('normal feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['all'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['all'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['all'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['all'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: true } },
      ]);
    });
  });
});

describe('global allPrivilegeExcludedFromBase feature privilege read', () => {
  describe('default and marketing space', () => {
    it('base all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
        { spaces: ['default', 'marketing'], base: ['all'], feature: {} },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
      ]);
    });

    it('base read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
        { spaces: ['default', 'marketing'], base: ['read'], feature: {} },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: false } },
      ]);
    });

    it('normal feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('normal feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['all'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('bothPrivilegesExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { bothPrivilegesExcludedFromBase: ['read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);

      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['all'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });

    it('allPrivilegeExcludedFromBase feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
        {
          spaces: ['default', 'marketing'],
          base: [],
          feature: { allPrivilegeExcludedFromBase: ['read'] },
        },
      ]);
      const { container } = renderWithI18n(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromContainer(container);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });
  });
});
