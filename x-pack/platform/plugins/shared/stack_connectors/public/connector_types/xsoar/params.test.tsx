/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { ActionConnectorMode } from '@kbn/triggers-actions-ui-plugin/public/types';
import XSOARParamsFields from './params';
import type { UseSubActionParams } from '@kbn/triggers-actions-ui-plugin/public/application/hooks/use_sub_action';
import { SUB_ACTION } from '../../../common/xsoar/constants';
import type { ExecutorParams, XSOARRunActionParams } from '../../../common/xsoar/types';
import * as translations from './translations';

interface Result {
  isLoading: boolean;
  response: Record<string, unknown>;
  error: null | Error;
}

const triggersActionsPath = '@kbn/triggers-actions-ui-plugin/public';

const response = {
  playbooks: [
    {
      id: '8db0105c-f674-4d83-8095-f95a9f61e77a',
      version: 4,
      cacheVersn: 0,
      sequenceNumber: 33831652,
      primaryTerm: 11,
      modified: '2023-12-12T13:51:15.668021556Z',
      sizeInBytes: 0,
      packID: '',
      packName: '',
      itemVersion: '',
      fromServerVersion: '',
      toServerVersion: '',
      propagationLabels: ['all'],
      definitionId: '',
      vcShouldIgnore: false,
      vcShouldKeepItemLegacyProdMachine: false,
      commitMessage: '',
      shouldCommit: false,
      name: 'playbook0',
      nameRaw: 'playbook0',
      prevName: 'aaa',
      startTaskId: '0',
      tasks: {
        '0': {
          id: '0',
          taskId: 'e228a044-2ad5-4ab0-873a-d5bb94a5c1b4',
          type: 'start',
          task: {
            id: 'e228a044-2ad5-4ab0-873a-d5bb94a5c1b4',
            version: 1,
            cacheVersn: 0,
            sequenceNumber: 13431901,
            primaryTerm: 8,
            modified: '2023-05-23T07:16:19.930125981Z',
            sizeInBytes: 0,
          },
          nextTasks: {
            '#none#': ['1'],
          },
          continueOnErrorType: '',
          view: {
            position: {
              x: 450,
              y: 50,
            },
          },
          evidenceData: {},
        },
        '1': {
          id: '1',
          taskId: 'c28b63d3-c860-4e16-82b4-6db6b58bdee3',
          type: 'regular',
          task: {
            id: 'c28b63d3-c860-4e16-82b4-6db6b58bdee3',
            version: 1,
            cacheVersn: 0,
            sequenceNumber: 33831651,
            primaryTerm: 11,
            modified: '2023-12-12T13:51:15.604271789Z',
            sizeInBytes: 0,
            name: 'Untitled Task 1',
            description: 'commands.local.cmd.set.incident',
            scriptId: 'Builtin|||setIncident',
            type: 'regular',
            isCommand: true,
            brand: 'Builtin',
          },
          scriptArguments: {
            severity: {
              simple: '1',
            },
          },
          continueOnErrorType: '',
          view: {
            position: {
              x: 450,
              y: 200,
            },
          },
          evidenceData: {},
        },
      },
      taskIds: ['e228a044-2ad5-4ab0-873a-d5bb94a5c1b4', 'c28b63d3-c860-4e16-82b4-6db6b58bdee3'],
      scriptIds: [],
      commands: ['setIncident'],
      brands: ['Builtin'],
      missingScriptsIds: ['Builtin|||setIncident'],
      view: {
        linkLabelsPosition: {},
        paper: {
          dimensions: {
            height: 245,
            width: 380,
            x: 450,
            y: 50,
          },
        },
      },
      inputs: null,
      outputs: null,
      quiet: true,
    },
  ],
  tags: [
    'Phishing',
    'Sandbox',
    'Severity',
    'Malware',
    'Remediation',
    'Job',
    'Sinkhole',
    'TIM',
    'PAN-OS',
  ],
  total: 1,
};

const mockUseSubActionPlaybooks = jest.fn().mockImplementation(() => ({
  isLoading: false,
  response,
  error: null,
}));
const mockUseSubAction = jest.fn<Result, [UseSubActionParams<unknown>]>(mockUseSubActionPlaybooks);

const mockToasts = { danger: jest.fn(), warning: jest.fn() };
jest.mock(triggersActionsPath, () => {
  const original = jest.requireActual(triggersActionsPath);
  return {
    ...original,
    useSubAction: (params: UseSubActionParams<unknown>) => mockUseSubAction(params),
    useKibana: () => ({
      ...original.useKibana(),
      notifications: { toasts: mockToasts },
    }),
  };
});

describe('XSOARParamsFields renders', () => {
  const subActionParams: XSOARRunActionParams = {
    name: 'new incident',
    playbookId: '8db0105c-f674-4d83-8095-f95a9f61e77a',
    createInvestigation: false,
    severity: 2,
    isRuleSeverity: false,
    body: '',
  };

  const actionParams: ExecutorParams = {
    subAction: SUB_ACTION.RUN,
    subActionParams,
  };
  const connector: ActionConnector = {
    secrets: {},
    config: {},
    id: 'test',
    actionTypeId: '.test',
    name: 'Test',
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false as const,
  };

  const editAction = jest.fn();
  const defaultProps = {
    actionConnector: connector,
    actionParams,
    editAction,
    errors: { name: [] },
    index: 0,
    messageVariables: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('New connector', () => {
    it('should render empty run form', () => {
      const props = { ...defaultProps, actionParams: {} };
      const { getByTestId } = render(<XSOARParamsFields {...props} />);

      expect(getByTestId('nameInput')).toBeInTheDocument();
      expect(getByTestId('xsoar-playbookSelector')).toBeInTheDocument();
      expect(getByTestId('rule-severity-toggle')).toBeInTheDocument();
      expect(getByTestId('bodyJsonEditor')).toBeInTheDocument();

      expect(getByTestId('rule-severity-toggle')).not.toBeChecked();
      expect(getByTestId('bodyJsonEditor')).toHaveProperty('value', '');

      expect(editAction).toHaveBeenCalledWith('subAction', SUB_ACTION.RUN, 0);
      expect(editAction).toHaveBeenCalledWith(
        'subActionParams',
        { createInvestigation: false, severity: 0 },
        0
      );
    });

    it('should render empty test form', () => {
      const props = { ...defaultProps, actionParams: {}, executionMode: ActionConnectorMode.Test };
      const { getByTestId } = render(<XSOARParamsFields {...props} />);

      expect(getByTestId('nameInput')).toBeInTheDocument();
      expect(getByTestId('xsoar-playbookSelector')).toBeInTheDocument();
      expect(getByTestId('severitySelectInput')).toBeInTheDocument();
      expect(getByTestId('bodyJsonEditor')).toBeInTheDocument();

      expect(getByTestId('severitySelectInput')).toHaveValue('0');
      expect(getByTestId('bodyJsonEditor')).toHaveProperty('value', '');

      expect(editAction).toHaveBeenCalledWith('subAction', SUB_ACTION.RUN, 0);
      expect(editAction).toHaveBeenCalledWith(
        'subActionParams',
        { createInvestigation: false, severity: 0 },
        0
      );
    });

    it('should renders playbook selector and start investigation toggle after playbook selection', async () => {
      const props = { ...defaultProps, actionParams: {} };
      render(<XSOARParamsFields {...props} />);

      expect(mockUseSubActionPlaybooks).toHaveBeenCalledWith(
        expect.objectContaining({ subAction: 'getPlaybooks' })
      );

      await waitFor(() => {
        expect(screen.getByTestId('comboBoxSearchInput')).not.toBeDisabled();
      });

      await userEvent.click(screen.getByTestId('comboBoxSearchInput'));
      expect(screen.getByText('playbook0')).toBeInTheDocument();
      await userEvent.click(screen.getByText('playbook0'), { pointerEventsCheck: 0 });

      await waitFor(() => {
        expect(editAction).toHaveBeenCalledTimes(3);
        expect(editAction).toHaveBeenCalledWith('subAction', SUB_ACTION.RUN, 0);
        expect(editAction).toHaveBeenCalledWith(
          'subActionParams',
          { createInvestigation: false, severity: 0 },
          0
        );
        expect(editAction).toHaveBeenCalledWith(
          'subActionParams',
          {
            createInvestigation: false,
            playbookId: '8db0105c-f674-4d83-8095-f95a9f61e77a',
            severity: 0,
          },
          0
        );
      });

      expect(screen.getByTestId('createInvestigation-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('createInvestigation-toggle')).not.toBeChecked();
    });
  });

  describe('Edit connector', () => {
    it('all Params fields is rendered', () => {
      const { getByTestId } = render(<XSOARParamsFields {...defaultProps} />);

      expect(mockUseSubActionPlaybooks).toHaveBeenCalledWith(
        expect.objectContaining({ subAction: 'getPlaybooks' })
      );

      expect(getByTestId('nameInput')).toBeInTheDocument();
      expect(getByTestId('xsoar-playbookSelector')).toBeInTheDocument();
      expect(getByTestId('createInvestigation-toggle')).toBeInTheDocument();
      expect(getByTestId('rule-severity-toggle')).toBeInTheDocument();
      expect(getByTestId('severitySelectInput')).toBeInTheDocument();
      expect(getByTestId('bodyJsonEditor')).toBeInTheDocument();

      expect(getByTestId('nameInput')).toHaveValue('new incident');
      expect(getByTestId('comboBoxSearchInput')).toHaveProperty('value', 'playbook0');
      expect(getByTestId('createInvestigation-toggle')).not.toBeChecked();
      expect(getByTestId('rule-severity-toggle')).not.toBeChecked();
      expect(getByTestId('severitySelectInput')).toHaveValue('2');
      expect(getByTestId('bodyJsonEditor')).toHaveProperty('value', '');
    });

    it('hides the severity select input when rule severity is enabled', () => {
      const { getByTestId } = render(<XSOARParamsFields {...defaultProps} />);
      const ruleSeverityToggleEl = getByTestId('rule-severity-toggle');

      fireEvent.click(ruleSeverityToggleEl);
      expect(getByTestId('rule-severity-toggle')).toBeEnabled();
      expect(editAction).toHaveBeenCalledWith(
        'subActionParams',
        { ...subActionParams, severity: 2, isRuleSeverity: true },
        0
      );

      expect(screen.queryByTestId('severitySelectInput')).not.toBeInTheDocument();
    });

    it('should show warning if playbook not found', () => {
      const props = {
        ...defaultProps,
        actionParams: { subActionParams: { ...subActionParams, playbookId: 'wrong-playbookId' } },
      };
      render(<XSOARParamsFields {...props} />);

      expect(mockToasts.warning).toHaveBeenCalledWith({
        title: translations.PLAYBOOK_NOT_FOUND_WARNING,
      });
    });

    it('should show error when playbooks subAction has error', () => {
      const errorMessage = 'something broke';
      mockUseSubActionPlaybooks.mockReturnValueOnce({
        isLoading: false,
        response,
        error: new Error(errorMessage),
      });

      render(<XSOARParamsFields {...defaultProps} />);

      expect(mockToasts.danger).toHaveBeenCalledWith({
        title: translations.PLAYBOOKS_ERROR,
        body: errorMessage,
      });
    });

    it('handles the case when subAction is undefined', () => {
      const props = {
        ...defaultProps,
        actionParams: {
          ...actionParams,
          subAction: undefined,
        },
      };
      render(<XSOARParamsFields {...props} />);
      expect(editAction).toHaveBeenCalledWith('subAction', SUB_ACTION.RUN, 0);
    });
  });
});
