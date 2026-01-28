/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import { render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import type { StatefulStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import {
  StreamNameFormRow,
  getErrorMessage,
  getHelpText,
  useChildStreamInput,
} from './stream_name_form_row';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

const mockRouter: StatefulStreamsAppRouter = {
  link: jest.fn().mockReturnValue('/mock-link'),
  push: jest.fn(),
  replace: jest.fn(),
  matchRoutes: jest.fn(),
  getParams: jest.fn(),
  getRoutePath: jest.fn(),
  getRoutesToMatch: jest.fn(),
} as StatefulStreamsAppRouter;

jest.mock('../../../hooks/use_streams_app_router', () => ({
  useStreamsAppRouter: () => mockRouter,
}));

const mockRoutingContext = {
  definition: {
    stream: { name: 'logs' },
  },
  routing: [] as Array<{ destination: string; isNew?: boolean }>,
};

jest.mock('./state_management/stream_routing_state_machine', () => ({
  useStreamsRoutingSelector: (
    selector: (snapshot: { context: typeof mockRoutingContext }) => any
  ) => selector({ context: mockRoutingContext }),
}));

describe('StreamNameFormRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoutingContext.routing = [];
  });

  describe('component', () => {
    it('should render the component with an error message provided', () => {
      renderWithProviders(
        <StreamNameFormRow
          partitionName="logs.test.error"
          prefix="logs."
          isStreamNameValid={false}
          errorMessage='Stream name cannot contain the "." character'
        />
      );

      const input = screen.getByTestId('streamsAppRoutingStreamEntryNameField');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Stream name cannot contain the "." character')).toBeInTheDocument();
    });

    it('should render the component with a help text provided', () => {
      renderWithProviders(
        <StreamNameFormRow
          partitionName="logs.test"
          prefix="logs."
          helpText="Stream name is required"
          isStreamNameValid={false}
        />
      );

      const input = screen.getByTestId('streamsAppRoutingStreamEntryNameField');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Stream name is required')).toBeInTheDocument();
    });

    it('should render the component with a valid stream name', () => {
      renderWithProviders(<StreamNameFormRow partitionName="valid-name" prefix="logs." />);

      const input = screen.getByTestId('streamsAppRoutingStreamEntryNameField');
      expect(input).not.toHaveAttribute('aria-invalid');
      expect(input).toHaveValue('valid-name');
    });

    it('should render the component with a prefix', () => {
      renderWithProviders(<StreamNameFormRow partitionName="logs.test" prefix="logs." />);

      expect(screen.getByTestId('streamsAppRoutingStreamNamePrefix')).toHaveTextContent('logs.');
    });

    it('should render the component with a read only input', () => {
      renderWithProviders(<StreamNameFormRow partitionName="logs.test" prefix="logs." readOnly />);

      const input = screen.getByTestId('streamsAppRoutingStreamEntryNameField');
      expect(input).toHaveAttribute('readonly');
    });
  });

  describe('getHelpText', () => {
    it('should return empty error help text when stream name is shorter than the prefix', () => {
      const result = getHelpText(true, false, false);
      expect(result).toBe('Stream name is required.');
    });

    it('should return name too long error help text when stream name is longer than 200 characters', () => {
      const result = getHelpText(false, true, false);
      expect(result).toBe('Stream name cannot be longer than 200 characters.');
    });

    it('should return undefined help text when input is valid', () => {
      const result = getHelpText(false, false, false);
      expect(result).toBeUndefined();
    });
  });

  describe('getErrorMessage', () => {
    it('should return uppercase chars error message when stream name contains uppercase characters', () => {
      const result = getErrorMessage(
        true,
        false,
        false,
        false,
        false,
        'logs.',
        'linux',
        mockRouter
      );
      expect(result).toBe('Stream name cannot contain uppercase characters.');
    });

    it('should return spaces error message when stream name contains spaces', () => {
      const result = getErrorMessage(
        false,
        true,
        false,
        false,
        false,
        'logs.',
        'linux',
        mockRouter
      );
      expect(result).toBe('Stream name cannot contain spaces.');
    });

    it('should return name conflict error message when stream name is duplicated', () => {
      const result = getErrorMessage(
        false,
        false,
        true,
        false,
        false,
        'logs.',
        'linux',
        mockRouter
      );
      expect(result).toBe('A stream with this name already exists');
    });

    it('should return root child does not exist error message when root child stream does not exist', () => {
      const result = getErrorMessage(
        false,
        false,
        false,
        false,
        true,
        'logs.',
        'linux',
        mockRouter
      );
      expect(result).toBe('The child stream logs.linux does not exist. Please create it first.');
    });

    it('should return name contains dot error message component when stream name contains a dot', () => {
      const result = getErrorMessage(false, false, false, true, true, 'logs.', 'linux', mockRouter);
      render(<I18nProvider>{result}</I18nProvider>);
      expect(screen.getByText(/Stream name cannot contain the "." character/)).toBeInTheDocument();
      expect(screen.getByTestId('streamsAppChildStreamLink')).toHaveTextContent('logs.linux');
    });

    it('should return undefined error message when input is valid', () => {
      const result = getErrorMessage(
        false,
        false,
        false,
        false,
        false,
        'logs.',
        'linux',
        mockRouter
      );
      expect(result).toBeUndefined();
    });
  });

  describe('useChildStreamInput', () => {
    beforeEach(() => {
      mockRoutingContext.routing = [];
      mockRoutingContext.definition.stream.name = 'logs';
    });

    it('should initialize with correct stream name and prefix', () => {
      const { result } = renderHook(() => useChildStreamInput('logs.test'));

      expect(result.current.localStreamName).toBe('logs.test');
      expect(result.current.prefix).toBe('logs.');
      expect(result.current.partitionName).toBe('test');
    });

    it('should return valid state for a valid stream name', () => {
      const { result } = renderHook(() => useChildStreamInput('logs.mystream'));

      expect(result.current.isStreamNameValid).toBe(true);
      expect(result.current.helpText).toBeUndefined();
      expect(result.current.errorMessage).toBeUndefined();
    });

    it('should return invalid state when stream name is empty', () => {
      const { result } = renderHook(() => useChildStreamInput('logs.'));

      expect(result.current.isStreamNameValid).toBe(false);
      expect(result.current.helpText).toBe('Stream name is required.');
    });

    it('should detect duplicate stream names', () => {
      mockRoutingContext.routing = [{ destination: 'logs.existing', isNew: false }];

      const { result } = renderHook(() => useChildStreamInput('logs.existing'));

      expect(result.current.isStreamNameValid).toBe(false);
      expect(result.current.errorMessage).toBe('A stream with this name already exists');
    });

    it('should not flag new streams as duplicates', () => {
      mockRoutingContext.routing = [{ destination: 'logs.newstream', isNew: true }];

      const { result } = renderHook(() => useChildStreamInput('logs.newstream'));

      expect(result.current.isStreamNameValid).toBe(true);
      expect(result.current.errorMessage).toBeUndefined();
    });

    it('should detect error when stream name contains spaces', () => {
      const { result } = renderHook(() => useChildStreamInput('logs.my stream'));

      expect(result.current.isStreamNameValid).toBe(false);
      expect(result.current.errorMessage).toBe('Stream name cannot contain spaces.');
    });

    it('should detect error when root child does not exist', () => {
      const { result } = renderHook(() => useChildStreamInput('logs.parent.child'));

      expect(result.current.isStreamNameValid).toBe(false);
      expect(result.current.errorMessage).toBe(
        'The child stream logs.parent does not exist. Please create it first.'
      );
    });

    it('should return FormattedMessage error when dot present and root child exists', () => {
      mockRoutingContext.routing = [{ destination: 'logs.parent', isNew: false }];

      const { result } = renderHook(() => useChildStreamInput('logs.parent.child'));

      expect(result.current.isStreamNameValid).toBe(false);
      render(<I18nProvider>{result.current.errorMessage}</I18nProvider>);
      expect(screen.getByText(/Stream name cannot contain the "." character/)).toBeInTheDocument();
      expect(screen.getByTestId('streamsAppChildStreamLink')).toHaveTextContent('logs.parent');
    });
  });
});
