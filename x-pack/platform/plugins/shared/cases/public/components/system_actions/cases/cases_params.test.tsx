/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { showEuiComboBoxOptions } from '@elastic/eui/lib/test/rtl';
import { useAlertsDataView } from '@kbn/alerts-ui-shared/src/common/hooks/use_alerts_data_view';
import { useApplication } from '../../../common/lib/kibana/use_application';
import { CasesParamsFields } from './cases_params';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { useGetAllCaseConfigurations } from '../../../containers/configure/use_get_all_case_configurations';
import { useGetAllCaseConfigurationsResponse } from '../../configure_cases/__mock__';
import { templatesConfigurationMock } from '../../../containers/mock';
import * as utils from '../../../containers/configure/utils';

jest.mock('@kbn/alerts-ui-shared/src/common/hooks/use_alerts_data_view');
jest.mock('../../../common/lib/kibana/use_application');
jest.mock('../../../common/lib/kibana/kibana_react');
jest.mock('../../../containers/configure/use_get_all_case_configurations');

const useKibanaMock = jest.mocked(useKibana);
const useAlertsDataViewMock = jest.mocked(useAlertsDataView);
const useApplicationMock = useApplication as jest.Mock;
const useGetAllCaseConfigurationsMock = useGetAllCaseConfigurations as jest.Mock;

const actionParams = {
  subAction: 'run',
  subActionParams: {
    timeWindow: '6w',
    reopenClosedCases: false,
    groupingBy: [],
  },
};

const connector: ActionConnector = {
  id: 'test',
  actionTypeId: '.test',
  name: 'Test',
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: true as const,
};
const editAction = jest.fn();
const defaultProps = {
  actionConnector: connector,
  actionParams,
  editAction,
  errors: { 'subActionParams.timeWindow.size': [] },
  index: 0,
  producerId: 'test',
};

describe('CasesParamsFields renders', () => {
  let user: UserEvent;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    });
    useApplicationMock.mockReturnValueOnce({ appId: 'management' });
    useAlertsDataViewMock.mockReturnValue({
      isLoading: false,
      dataView: {
        title: '.alerts-test',
        fields: [
          {
            name: 'host.ip',
            type: 'ip',
            aggregatable: true,
            searchable: true,
          },
          {
            name: 'host.geo.location',
            type: 'geo_point',
            aggregatable: false,
            searchable: true,
          },
        ],
      },
    });
    useGetAllCaseConfigurationsMock.mockImplementation(() => useGetAllCaseConfigurationsResponse);
    useKibanaMock.mockReturnValue({
      services: { ...createStartServicesMock(), data: { dataViews: {} } },
    } as unknown as ReturnType<typeof useKibana>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('all params fields are rendered', async () => {
    render(<CasesParamsFields {...defaultProps} />);

    expect(await screen.findByTestId('group-by-alert-field-combobox')).toBeInTheDocument();
    expect(await screen.findByTestId('time-window-size-input')).toBeInTheDocument();
    expect(await screen.findByTestId('time-window-unit-select')).toBeInTheDocument();
    expect(await screen.findByTestId('create-case-template-select')).toBeInTheDocument();
    expect(await screen.findByTestId('reopen-case')).toBeInTheDocument();
  });

  it('renders loading state of grouping by fields correctly', async () => {
    useAlertsDataViewMock.mockReturnValue({ isLoading: true });
    render(<CasesParamsFields {...defaultProps} />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
  });

  it('disables dropdown when loading grouping by fields', async () => {
    useAlertsDataViewMock.mockReturnValue({ isLoading: true });
    render(<CasesParamsFields {...defaultProps} />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByTestId('comboBoxSearchInput')).toBeDisabled();
  });

  it('when subAction undefined, sets to default', () => {
    const newProps = {
      ...defaultProps,
      actionParams: {},
    };
    render(<CasesParamsFields {...newProps} />);

    expect(editAction.mock.calls[0][1]).toEqual('run');
  });

  it('when subActionParams undefined, sets to default', () => {
    const newProps = {
      ...defaultProps,
      actionParams: {
        subAction: 'run',
      },
    };
    render(<CasesParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual({
      timeWindow: '7d',
      reopenClosedCases: false,
      groupingBy: [],
      templateId: null,
    });
  });

  it('If timeWindow has errors, form row is invalid', async () => {
    const newProps = {
      ...defaultProps,
      errors: { timeWindow: ['error'] },
    };

    render(<CasesParamsFields {...newProps} />);

    expect(await screen.findByText('error')).toBeInTheDocument();
  });

  describe('UI updates', () => {
    it('renders grouping by field options', async () => {
      render(<CasesParamsFields {...defaultProps} />);

      await user.click(await screen.findByTestId('group-by-alert-field-combobox'));

      await showEuiComboBoxOptions();

      expect(await screen.findByText('host.ip')).toBeInTheDocument();

      expect(screen.queryByText('host.geo.location')).not.toBeInTheDocument();
    });

    it('updates grouping by field', async () => {
      render(<CasesParamsFields {...defaultProps} />);

      await user.click(await screen.findByTestId('group-by-alert-field-combobox'));

      await showEuiComboBoxOptions();

      expect(await screen.findByText('host.ip')).toBeInTheDocument();

      await user.click(await screen.findByText('host.ip'));

      expect(editAction.mock.calls[0][1].groupingBy).toEqual(['host.ip']);
    });

    it('updates grouping by field by search', async () => {
      useAlertsDataViewMock.mockReturnValue({
        isLoading: false,
        dataView: {
          title: '.alerts-test',
          fields: [
            {
              name: 'host.ip',
              type: 'ip',
              aggregatable: true,
              searchable: true,
            },
            {
              name: 'host.geo.location',
              type: 'geo_point',
              aggregatable: false,
              searchable: true,
            },
            {
              name: 'alert.name',
              type: 'string',
              aggregatable: true,
              searchable: true,
            },
          ],
        },
      });

      render(<CasesParamsFields {...defaultProps} />);

      await user.click(await screen.findByTestId('group-by-alert-field-combobox'));

      await showEuiComboBoxOptions();

      await user.type(await screen.findByTestId('comboBoxSearchInput'), 'alert.name{enter}');

      expect(editAction.mock.calls[0][1].groupingBy).toEqual(['alert.name']);
    });

    it('renders default template correctly', async () => {
      render(<CasesParamsFields {...defaultProps} />);

      expect(await screen.findByTestId('create-case-template-select')).toBeInTheDocument();
      expect(await screen.findByText('No template selected')).toBeInTheDocument();
    });

    it('renders selected templates correctly', async () => {
      useGetAllCaseConfigurationsMock.mockImplementation(() => ({
        ...useGetAllCaseConfigurationsResponse,
        data: [
          {
            ...useGetAllCaseConfigurationsResponse.data[0],
            templates: templatesConfigurationMock,
          },
        ],
      }));

      const newProps = {
        ...defaultProps,
        producerId: 'siem',
        actionParams: {
          subAction: 'run',
          subActionParams: {
            ...actionParams.subActionParams,
            templateId: templatesConfigurationMock[1].key,
          },
        },
      };

      render(<CasesParamsFields {...newProps} />);

      expect(await screen.findByTestId('create-case-template-select')).toBeInTheDocument();
      expect(await screen.findByText(templatesConfigurationMock[1].name)).toBeInTheDocument();
    });

    it('renders security templates if the project is serverless security', async () => {
      useKibanaMock.mockReturnValue({
        services: {
          ...createStartServicesMock(),
          // simulate a serverless security project
          cloud: { isServerlessEnabled: true, serverless: { projectType: 'security' } },
          data: { dataViews: {} },
        },
      } as unknown as ReturnType<typeof useKibana>);

      const configuration = {
        ...useGetAllCaseConfigurationsResponse.data[0],
        templates: templatesConfigurationMock,
      };
      useGetAllCaseConfigurationsMock.mockImplementation(() => ({
        ...useGetAllCaseConfigurationsResponse,
        data: [configuration],
      }));
      const getConfigurationByOwnerSpy = jest
        .spyOn(utils, 'getConfigurationByOwner')
        .mockImplementation(() => configuration);

      const observabilityOwnedRule = {
        ...defaultProps,
        // these two would normally produce an observability owner
        producerId: 'observability',
        featureId: 'observability',
        actionParams: {
          subAction: 'run',
          subActionParams: {
            ...actionParams.subActionParams,
            templateId: templatesConfigurationMock[1].key,
          },
        },
      };

      render(<CasesParamsFields {...observabilityOwnedRule} />);

      expect(getConfigurationByOwnerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          // the security owner was forced
          owner: 'securitySolution',
        })
      );

      getConfigurationByOwnerSpy.mockRestore();
    });

    it('updates template correctly', async () => {
      useGetAllCaseConfigurationsMock.mockReturnValueOnce({
        ...useGetAllCaseConfigurationsResponse,
        data: [
          {
            ...useGetAllCaseConfigurationsResponse.data[0],
            templates: templatesConfigurationMock,
          },
        ],
      });

      const selectedTemplate = templatesConfigurationMock[4];
      const newProps = { ...defaultProps, producerId: 'siem' };

      render(<CasesParamsFields {...newProps} />);

      await user.selectOptions(
        screen.getByTestId('create-case-template-select'),
        selectedTemplate.name
      );

      expect(editAction.mock.calls[0][1].templateId).toEqual(selectedTemplate.key);
      expect(await screen.findByText(selectedTemplate.name)).toBeInTheDocument();
    });

    it('updates time window size', async () => {
      render(<CasesParamsFields {...defaultProps} />);

      // There seems to be a bug with userEvent v14 and input[type=number]
      // where it's not able to clear the input value, so falling back to fireEvent.

      const timeWindowSizeInput = await screen.findByTestId('time-window-size-input');

      expect(timeWindowSizeInput).toBeInTheDocument();
      expect(timeWindowSizeInput).toHaveValue(6);

      fireEvent.change(timeWindowSizeInput, { target: { value: '5' } });

      expect(editAction.mock.calls[0][1].timeWindow).toEqual('5w');
    });

    it('updates time window unit', async () => {
      render(<CasesParamsFields {...defaultProps} />);

      expect(await screen.findByTestId('time-window-unit-select')).toBeInTheDocument();

      fireEvent.change(await screen.findByTestId('time-window-unit-select'), {
        target: { value: 'd' },
      });

      expect(editAction.mock.calls[0][1].timeWindow).toEqual('6d');
    });

    it('updates reopenClosedCases', async () => {
      render(<CasesParamsFields {...defaultProps} />);

      expect(await screen.findByTestId('reopen-case')).toBeInTheDocument();

      await user.click(await screen.findByTestId('reopen-case'));

      expect(editAction.mock.calls[0][1].reopenClosedCases).toEqual(true);
    });
  });
});
