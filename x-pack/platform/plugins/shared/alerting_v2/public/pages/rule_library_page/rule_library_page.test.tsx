/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { RuleLibraryPage } from './rule_library_page';

const mockOpenCreateFromTemplate = jest.fn();
const mockOpenEditFlyout = jest.fn();
const mockInstallMutate = jest.fn();

jest.mock('../../application/breadcrumb_context', () => ({
  useSetBreadcrumbs: () => jest.fn(),
}));

jest.mock('@kbn/core-di-browser', () => {
  return {
    useService: (token: unknown) => {
      if (token === 'chrome') {
        return { docTitle: { change: jest.fn() } };
      }
      if (token === 'http') {
        return { basePath: { prepend: (path: string) => path } };
      }
      return {};
    },
    CoreStart: (key: string) => key,
  };
});

jest.mock('./components/rule_library_table', () => ({
  RuleLibraryTable: ({
    onCreateFromTemplate,
  }: {
    onCreateFromTemplate: (templateId: string, data: unknown) => void;
  }) => (
    <button
      type="button"
      data-test-subj="mockedRuleLibraryTable"
      onClick={() => onCreateFromTemplate('template-1', { kind: 'alert' })}
    />
  ),
}));

jest.mock('../../hooks/use_compose_discover_flyout', () => ({
  useComposeDiscoverFlyout: () => ({
    flyout: <div data-test-subj="mockedComposeFlyout" />,
    openCreateFromTemplate: mockOpenCreateFromTemplate,
    openEditFlyout: mockOpenEditFlyout,
  }),
}));

jest.mock('../../hooks/use_install_disabled_rule', () => ({
  useInstallDisabledRule: () => ({
    mutate: mockInstallMutate,
    isLoading: false,
  }),
}));

const renderPage = () =>
  render(
    <ListPageTestProviders>
      <RuleLibraryPage />
    </ListPageTestProviders>
  );

describe('RuleLibraryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the rule library table', () => {
    renderPage();

    expect(screen.getByTestId('mockedRuleLibraryTable')).toBeInTheDocument();
  });

  it('renders the page header with experimental badge and back link', () => {
    renderPage();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Rule library');
    expect(screen.getByTestId('alertingV2ExperimentalBadge')).toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toBeInTheDocument();
  });

  it('renders the compose flyout host', () => {
    renderPage();

    expect(screen.getByTestId('mockedComposeFlyout')).toBeInTheDocument();
  });

  it('renders the 1 click install toggle off by default', () => {
    renderPage();

    const toggle = screen.getByTestId('ruleLibraryOneClickInstallSwitch');
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toBeChecked();
  });

  it('opens the compose flyout when create is clicked with 1 click install off', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('mockedRuleLibraryTable'));

    expect(mockOpenCreateFromTemplate).toHaveBeenCalledWith({ kind: 'alert' });
    expect(mockInstallMutate).not.toHaveBeenCalled();
  });

  it('installs a disabled rule then opens the Actions step when 1 click install is on', () => {
    mockInstallMutate.mockImplementation((_data, opts) => {
      opts?.onSuccess?.({ id: 'rule-1', enabled: false, metadata: { name: 'Installed' } });
      opts?.onSettled?.();
    });

    renderPage();

    fireEvent.click(screen.getByTestId('ruleLibraryOneClickInstallSwitch'));
    fireEvent.click(screen.getByTestId('mockedRuleLibraryTable'));

    expect(mockInstallMutate).toHaveBeenCalledWith(
      { kind: 'alert' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
    expect(mockOpenEditFlyout).toHaveBeenCalledWith(
      { id: 'rule-1', enabled: false, metadata: { name: 'Installed' } },
      { initialStepId: 'notifications' }
    );
    expect(mockOpenCreateFromTemplate).not.toHaveBeenCalled();
  });
});
