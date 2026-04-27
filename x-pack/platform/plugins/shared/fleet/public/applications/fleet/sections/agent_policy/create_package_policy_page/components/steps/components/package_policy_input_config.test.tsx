/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createFleetTestRendererMock } from '../../../../../../../../mock';

import { PackagePolicyInputConfig } from './package_policy_input_config';

describe('PackagePolicyInputConfig', () => {
  function render(value = 'generic', datastreams: any = []) {
    const renderer = createFleetTestRendererMock();
    const mockOnChange = jest.fn();

    const utils = renderer.render(
      <PackagePolicyInputConfig
        hasInputStreams={false}
        inputValidationResults={{}}
        packagePolicyInput={{
          enabled: true,
          type: 'input',
          streams: [],
        }}
        updatePackagePolicyInput={mockOnChange}
        packageInputVars={[
          {
            name: 'test',
            title: 'Test',
            type: 'text',
            show_user: true,
          },
        ]}
      />
    );

    return { utils, mockOnChange };
  }

  it('should support input vars with show_user:true without default value', () => {
    const { utils } = render();

    const inputEl = utils.findByTestId('textInput-test');
    expect(inputEl).toBeDefined();
  });

  it('should hide deprecated vars on new installations (isEditPage=false)', () => {
    const renderer = createFleetTestRendererMock();
    const mockOnChange = jest.fn();

    const utils = renderer.render(
      <PackagePolicyInputConfig
        hasInputStreams={false}
        inputValidationResults={{}}
        packagePolicyInput={{
          enabled: true,
          type: 'input',
          streams: [],
        }}
        updatePackagePolicyInput={mockOnChange}
        packageInputVars={[
          {
            name: 'active_var',
            title: 'Active Var',
            type: 'text',
            show_user: true,
          },
          {
            name: 'deprecated_var',
            title: 'Deprecated Var',
            type: 'text',
            show_user: true,
            deprecated: {
              description: 'This variable is deprecated',
            },
          },
        ]}
        isEditPage={false}
      />
    );

    expect(utils.queryByText('Active Var')).toBeInTheDocument();
    expect(utils.queryByText('Deprecated Var')).not.toBeInTheDocument();
  });

  it('should render section titles for vars with a matching section attribute', () => {
    const renderer = createFleetTestRendererMock();
    const mockOnChange = jest.fn();

    const utils = renderer.render(
      <PackagePolicyInputConfig
        hasInputStreams={false}
        inputValidationResults={{}}
        packagePolicyInput={{
          enabled: true,
          type: 'input',
          streams: [],
        }}
        updatePackagePolicyInput={mockOnChange}
        packageInputVars={[
          {
            name: 'ungrouped_var',
            title: 'Ungrouped Var',
            type: 'text',
            show_user: true,
          },
          {
            name: 'auth_var',
            title: 'Auth Var',
            type: 'text',
            show_user: true,
            section: 'auth_section',
          },
        ]}
        sections={[{ name: 'auth_section', title: 'Authentication', description: 'Auth settings' }]}
      />
    );

    expect(utils.queryByText('Ungrouped Var')).toBeInTheDocument();
    expect(utils.queryByText('Authentication')).toBeInTheDocument();
    expect(utils.queryByText('Auth settings')).toBeInTheDocument();
    expect(utils.queryByText('Auth Var')).toBeInTheDocument();
  });

  it('should render vars without a section attribute as ungrouped even when sections are defined', () => {
    const renderer = createFleetTestRendererMock();
    const mockOnChange = jest.fn();

    const utils = renderer.render(
      <PackagePolicyInputConfig
        hasInputStreams={false}
        inputValidationResults={{}}
        packagePolicyInput={{
          enabled: true,
          type: 'input',
          streams: [],
        }}
        updatePackagePolicyInput={mockOnChange}
        packageInputVars={[
          {
            name: 'ungrouped_var',
            title: 'Ungrouped Var',
            type: 'text',
            show_user: true,
          },
        ]}
        sections={[{ name: 'auth_section', title: 'Authentication' }]}
      />
    );

    expect(utils.queryByText('Ungrouped Var')).toBeInTheDocument();
    // Section header should not render if no vars reference it
    expect(utils.queryByText('Authentication')).not.toBeInTheDocument();
  });

  it('should not render section titles when no sections prop is provided', () => {
    const renderer = createFleetTestRendererMock();
    const mockOnChange = jest.fn();

    const utils = renderer.render(
      <PackagePolicyInputConfig
        hasInputStreams={false}
        inputValidationResults={{}}
        packagePolicyInput={{
          enabled: true,
          type: 'input',
          streams: [],
        }}
        updatePackagePolicyInput={mockOnChange}
        packageInputVars={[
          {
            name: 'auth_var',
            title: 'Auth Var',
            type: 'text',
            show_user: true,
            section: 'auth_section',
          },
        ]}
      />
    );

    expect(utils.queryByText('Auth Var')).toBeInTheDocument();
    expect(utils.queryByText('Authentication')).not.toBeInTheDocument();
  });

  it('should show deprecated vars on edit page (isEditPage=true)', () => {
    const renderer = createFleetTestRendererMock();
    const mockOnChange = jest.fn();

    const utils = renderer.render(
      <PackagePolicyInputConfig
        hasInputStreams={false}
        inputValidationResults={{}}
        packagePolicyInput={{
          enabled: true,
          type: 'input',
          streams: [],
        }}
        updatePackagePolicyInput={mockOnChange}
        packageInputVars={[
          {
            name: 'active_var',
            title: 'Active Var',
            type: 'text',
            show_user: true,
          },
          {
            name: 'deprecated_var',
            title: 'Deprecated Var',
            type: 'text',
            show_user: true,
            deprecated: {
              description: 'This variable is deprecated',
            },
          },
        ]}
        isEditPage={true}
      />
    );

    expect(utils.queryByText('Active Var')).toBeInTheDocument();
    expect(utils.queryByText('Deprecated Var')).toBeInTheDocument();
  });
});
