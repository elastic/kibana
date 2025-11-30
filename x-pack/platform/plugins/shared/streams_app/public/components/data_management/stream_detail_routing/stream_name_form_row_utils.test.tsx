/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import type { StatefulStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { getHelpText, getErrorMessage } from './stream_name_form_row';
import { I18nProvider } from '@kbn/i18n-react';
import React from 'react';

describe('StreamNameFormRow utils', () => {
  let mockRouter: StatefulStreamsAppRouter;
  beforeEach(() => {
    mockRouter = {
      link: jest.fn(),
      push: jest.fn(),
      replace: jest.fn(),
      matchRoutes: jest.fn(),
      getParams: jest.fn(),
      getRoutePath: jest.fn(),
      getRoutesToMatch: jest.fn(),
    };
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
    it('should return name conflict error message when stream name is duplicated', () => {
      const result = getErrorMessage(true, false, false, 'logs.', 'linux', mockRouter);
      expect(result).toBe('A stream with this name already exists');
    });

    it('should return root child does not exist error message when root child stream does not exist', () => {
      const result = getErrorMessage(false, false, true, 'logs.', 'linux', mockRouter);
      expect(result).toBe('The child stream logs.linux does not exist. Please create it first.');
    });

    it('should return name contains dot error message component when stream name contains a dot', () => {
      const result = getErrorMessage(false, true, true, 'logs.', 'linux', mockRouter);
      render(<I18nProvider>{result}</I18nProvider>);
      expect(screen.getByText(/Stream name cannot contain the "." character/)).toBeInTheDocument();
      expect(screen.getByTestId('streamsAppChildStreamLink')).toHaveTextContent('logs.linux');
    });

    it('should return undefined error message when input is valid', () => {
      const result = getErrorMessage(false, false, false, 'logs.', 'linux', mockRouter);
      expect(result).toBeUndefined();
    });
  });
});
