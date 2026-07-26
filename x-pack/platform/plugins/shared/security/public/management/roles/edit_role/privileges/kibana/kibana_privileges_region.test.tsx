/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import type { Role } from '@kbn/security-plugin-types-common';
import { KibanaPrivileges } from '@kbn/security-role-management-model';
import { spacesManagerMock } from '@kbn/spaces-plugin/public/spaces_manager/mocks';
import { getUiApi } from '@kbn/spaces-plugin/public/ui_api';

import { KibanaPrivilegesRegion } from './kibana_privileges_region';
import { RoleValidator } from '../../validate_role';

jest.mock('./simple_privilege_section', () => ({
  SimplePrivilegeSection: () => <div data-test-subj="simplePrivilegeSection" />,
}));

jest.mock('./space_aware_privilege_section', () => ({
  SpaceAwarePrivilegeSection: () => <div data-test-subj="spaceAwarePrivilegeSection" />,
}));

jest.mock('./transform_error_section', () => ({
  TransformErrorSection: () => <div data-test-subj="transformErrorSection" />,
}));

const spacesManager = spacesManagerMock.create();
const { getStartServices } = coreMock.createSetup();
const spacesApiUi = getUiApi({ spacesManager, getStartServices });

const renderWithIntl = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

const buildProps = () => {
  return {
    role: {
      name: '',
      elasticsearch: {
        cluster: [],
        indices: [],
        run_as: [],
      },
      kibana: [],
    },
    spaces: [
      {
        id: 'default',
        name: 'Default Space',
        disabledFeatures: [],
        _reserved: true,
      },
      {
        id: 'marketing',
        name: 'Marketing',
        disabledFeatures: [],
      },
    ],
    features: [],
    kibanaPrivileges: new KibanaPrivileges(
      {
        global: {},
        space: {},
        features: {},
        reserved: {},
      },
      []
    ),
    intl: null as any,
    uiCapabilities: {
      navLinks: {},
      management: {},
      catalogue: {},
      spaces: {
        manage: true,
      },
    },
    editable: true,
    onChange: jest.fn(),
    validator: new RoleValidator(),
    canCustomizeSubFeaturePrivileges: true,
    spacesEnabled: true,
    spacesApiUi,
  };
};

describe('<KibanaPrivileges>', () => {
  it('renders without crashing', () => {
    const props = buildProps();
    const { container } = renderWithIntl(<KibanaPrivilegesRegion {...props} />);
    expect(container.children[0]).toMatchSnapshot();
  });

  it('renders the space-aware privilege form', () => {
    const props = buildProps();
    renderWithIntl(<KibanaPrivilegesRegion {...props} />);
    expect(screen.getByTestId('spaceAwarePrivilegeSection')).toBeInTheDocument();
    expect(screen.queryByTestId('simplePrivilegeSection')).toBeNull();
  });

  it('renders simple privilege form when spaces is disabled', () => {
    const props = buildProps();
    renderWithIntl(<KibanaPrivilegesRegion {...props} spacesEnabled={false} />);
    expect(screen.getByTestId('simplePrivilegeSection')).toBeInTheDocument();
    expect(screen.queryByTestId('spaceAwarePrivilegeSection')).toBeNull();
  });

  it('renders the transform error section when the role has a transform error', () => {
    const props = buildProps();
    (props.role as Role)._transform_error = [
      { reason: 'kibana:reserved_privileges_mixed', state: [] },
    ];

    renderWithIntl(<KibanaPrivilegesRegion {...props} />);
    expect(screen.queryByTestId('spaceAwarePrivilegeSection')).not.toBeInTheDocument();
    expect(screen.getByTestId('transformErrorSection')).toBeInTheDocument();
  });
});
