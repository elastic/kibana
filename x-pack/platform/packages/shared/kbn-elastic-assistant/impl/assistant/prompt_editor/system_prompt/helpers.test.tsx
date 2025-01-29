/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { mockSuperheroSystemPrompt, mockSystemPrompt } from '../../../mock/system_prompt';
import { TestProviders } from '../../../mock/test_providers/test_providers';

import { getOptions, getOptionFromPrompt } from './helpers';

describe('helpers', () => {
  describe('getOptionFromPrompt', () => {
    const option = getOptionFromPrompt(mockSystemPrompt);
    it('returns an EuiSuperSelectOption with the correct value', () => {
      expect(option.value).toBe(mockSystemPrompt.id);
    });

    it('returns an EuiSuperSelectOption with the correct inputDisplay', () => {
      render(<>{option.inputDisplay}</>);

      expect(screen.getByTestId('systemPromptText')).toHaveTextContent(mockSystemPrompt.name);
    });

    it('shows the expected name in the dropdownDisplay', () => {
      render(<TestProviders>{option.dropdownDisplay}</TestProviders>);

      expect(screen.getByTestId(`systemPrompt-${mockSystemPrompt.name}`)).toHaveTextContent(
        mockSystemPrompt.name
      );
    });

    it('shows the expected prompt content in the dropdownDisplay', () => {
      render(<TestProviders>{option.dropdownDisplay}</TestProviders>);

      expect(screen.getByTestId('content')).toHaveTextContent(mockSystemPrompt.content);
    });
  });

  describe('getOptions', () => {
    it('should return an array of EuiSuperSelectOption with the correct values', () => {
      const prompts = [mockSystemPrompt, mockSuperheroSystemPrompt];
      const promptIds = prompts.map(({ id }) => id);

      const options = getOptions(prompts);
      const optionValues = options.map(({ value }) => value);

      expect(optionValues).toEqual(promptIds);
    });
  });
});
