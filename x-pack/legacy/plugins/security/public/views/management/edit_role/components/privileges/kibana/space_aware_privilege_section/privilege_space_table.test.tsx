/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBadge, EuiInMemoryTable, EuiIconTip } from '@elastic/eui';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ReactWrapper } from 'enzyme';
import { PrivilegeSpaceTable } from './privilege_space_table';
import { PrivilegeDisplay } from './privilege_display';
import { KibanaPrivileges, Role, RoleKibanaPrivilege } from '../../../../../../../../common/model';
import { KibanaPrivilegeCalculatorFactory } from '../../../../../../../lib/kibana_privilege_calculator';
import { rawKibanaPrivileges } from './__fixtures__';

interface TableRow {
  spaces: string[];
  privileges: {
    summary: string;
  };
}

const buildProps = (roleKibanaPrivileges: RoleKibanaPrivilege[]): PrivilegeSpaceTable['props'] => {
  const kibanaPrivileges = new KibanaPrivileges(rawKibanaPrivileges);
  return {
    role: {
      name: 'test role',
      elasticsearch: {
        cluster: ['all'],
        indices: [] as any[],
        run_as: [] as string[],
      },
      kibana: roleKibanaPrivileges,
    },
    privilegeCalculatorFactory: new KibanaPrivilegeCalculatorFactory(kibanaPrivileges),
    onChange: (role: Role) => {},
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
    intl: {} as any,
  };
};

const getTableFromComponent = (
  component: ReactWrapper<any, Readonly<{}>, React.Component<{}, {}, any>>
): TableRow[] => {
  const table = component.find(EuiInMemoryTable);
  const rows = table.find('tr');
  const dataRows = rows.slice(1);
  return dataRows.reduce((acc, row) => {
    const cells = row.find('td');
    const spacesCell = cells.at(0);
    const spacesBadge = spacesCell.find(EuiBadge);
    const privilegesCell = cells.at(1);
    const privilegesDisplay = privilegesCell.find(PrivilegeDisplay);
    return [
      ...acc,
      {
        spaces: spacesBadge.map(badge => badge.text().trim()),
        privileges: {
          summary: privilegesDisplay.text().trim(),
          overridden: privilegesDisplay.find(EuiIconTip).exists('[type="lock"]'),
        },
      },
    ];
  }, [] as TableRow[]);
};

describe('only global', () => {
  it('base all', () => {
    const props = buildProps([{ spaces: ['*'], base: ['all'], feature: {} }]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
    ]);
  });

  it('base read', () => {
    const props = buildProps([{ spaces: ['*'], base: ['read'], feature: {} }]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
    ]);
  });

  it('normal feature privilege all', () => {
    const props = buildProps([{ spaces: ['*'], base: [], feature: { normal: ['all'] } }]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('normal feature privilege read', () => {
    const props = buildProps([{ spaces: ['*'], base: [], feature: { normal: ['read'] } }]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('bothPrivilegesExcludedFromBase feature privilege all', () => {
    const props = buildProps([
      { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('bothPrivilegesExcludedFromBase feature privilege read', () => {
    const props = buildProps([
      { spaces: ['*'], base: [], feature: { bothPrivilegesExcludedFromBase: ['read'] } },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('allPrivilegeExcludedFromBase feature privilege all', () => {
    const props = buildProps([
      { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('allPrivilegeExcludedFromBase feature privilege read', () => {
    const props = buildProps([
      { spaces: ['*'], base: [], feature: { allPrivilegeExcludedFromBase: ['read'] } },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });
});

describe('only default and marketing space', () => {
  it('base all', () => {
    const props = buildProps([{ spaces: ['default', 'marketing'], base: ['all'], feature: {} }]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: false } },
    ]);
  });

  it('base read', () => {
    const props = buildProps([{ spaces: ['default', 'marketing'], base: ['read'], feature: {} }]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: false } },
    ]);
  });

  it('normal feature privilege all', () => {
    const props = buildProps([
      { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
    expect(actualTable).toEqual([
      { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
    ]);
  });

  it('normal feature privilege read', () => {
    const props = buildProps([
      { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
    ]);
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
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
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
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
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
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
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
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
    const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
    const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: true } },
      ]);
    });

    it('base read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        { spaces: ['default', 'marketing'], base: ['read'], feature: {} },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: true } },
      ]);
    });

    it('normal feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: true } },
      ]);
    });

    it('normal feature privilege read', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['all'], feature: {} },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['read'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: true } },
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'All', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'All', overridden: true } },
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: true } },
      ]);
    });

    it('normal feature privilege all', () => {
      const props = buildProps([
        { spaces: ['*'], base: ['read'], feature: {} },
        { spaces: ['default', 'marketing'], base: [], feature: { normal: ['all'] } },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: true } },
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Read', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Read', overridden: true } },
      ]);
    });
  });
});

describe('global normal feature privilege all', () => {
  describe('default and marketing space', () => {
    it('base all', () => {
      const props = buildProps([
        { spaces: ['*'], base: [], feature: { normal: ['all'] } },
        { spaces: ['default', 'marketing'], base: ['all'], feature: {} },
      ]);
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
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
      const component = mountWithIntl(<PrivilegeSpaceTable {...props} />);
      const actualTable = getTableFromComponent(component);
      expect(actualTable).toEqual([
        { spaces: ['*'], privileges: { summary: 'Custom', overridden: false } },
        { spaces: ['Default', 'Marketing'], privileges: { summary: 'Custom', overridden: false } },
      ]);
    });
  });
});
