/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { ComponentTemplateListItem } from '../../../../../common';
import { StepComponents } from './step_components';

const mockComponentTemplatesSelectorPropsSpy = jest.fn();

interface ComponentTemplatesSelectorMockProps {
  defaultValue?: string[];
  onComponentsLoaded: (components: ComponentTemplateListItem[]) => void;
  onChange: (components: string[]) => void;
}

jest.mock('../../component_templates', () => ({
  __esModule: true,
  ComponentTemplatesSelector: (props: ComponentTemplatesSelectorMockProps) => {
    mockComponentTemplatesSelectorPropsSpy(props);
    const { onComponentsLoaded, onChange, defaultValue } = props;

    return (
      <div data-test-subj="mockComponentTemplatesSelector">
        <div data-test-subj="mockDefaultValue">{JSON.stringify(defaultValue ?? null)}</div>
        <button
          type="button"
          data-test-subj="mockLoadComponentsEmpty"
          onClick={() => onComponentsLoaded([])}
        />
        <button
          type="button"
          data-test-subj="mockLoadComponentsNonEmpty"
          onClick={() =>
            onComponentsLoaded([
              {
                name: 'ct_1',
                usedBy: [],
                hasMappings: false,
                hasAliases: false,
                hasSettings: false,
                isManaged: false,
              },
            ])
          }
        />
        <button type="button" data-test-subj="mockSelectNone" onClick={() => onChange([])} />
        <button type="button" data-test-subj="mockSelectSome" onClick={() => onChange(['ct_1'])} />
      </div>
    );
  },
}));

describe('StepComponents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockComponentTemplatesSelectorPropsSpy.mockClear();
  });

  describe('WHEN components are loading', () => {
    it('SHOULD show the header', () => {
      render(
        <I18nProvider>
          <StepComponents esDocsBase="https://docs" onChange={jest.fn()} defaultValue={[]} />
        </I18nProvider>
      );

      expect(screen.getByTestId('stepComponents')).toBeInTheDocument();
      expect(screen.getByTestId('stepTitle')).toBeInTheDocument();
      expect(screen.getByTestId('mockComponentTemplatesSelector')).toBeInTheDocument();
    });
  });

  describe('WHEN loaded components list is empty', () => {
    it('SHOULD hide the header', () => {
      render(
        <I18nProvider>
          <StepComponents esDocsBase="https://docs" onChange={jest.fn()} defaultValue={[]} />
        </I18nProvider>
      );

      fireEvent.click(screen.getByTestId('mockLoadComponentsEmpty'));

      expect(screen.queryByTestId('stepTitle')).not.toBeInTheDocument();
    });
  });

  describe('WHEN loaded components list is non-empty', () => {
    it('SHOULD show the header', () => {
      render(
        <I18nProvider>
          <StepComponents esDocsBase="https://docs" onChange={jest.fn()} defaultValue={[]} />
        </I18nProvider>
      );

      fireEvent.click(screen.getByTestId('mockLoadComponentsNonEmpty'));

      expect(screen.getByTestId('stepTitle')).toBeInTheDocument();
    });
  });

  describe('WHEN selection is empty', () => {
    it('SHOULD emit wizard content with undefined data', () => {
      const onChange = jest.fn();
      render(
        <I18nProvider>
          <StepComponents esDocsBase="https://docs" onChange={onChange} defaultValue={[]} />
        </I18nProvider>
      );

      fireEvent.click(screen.getByTestId('mockSelectNone'));

      const content = onChange.mock.calls[0][0];
      expect(content.isValid).toBe(true);
      expect(content.getData()).toBeUndefined();
    });
  });

  describe('WHEN components are selected', () => {
    it('SHOULD emit wizard content with the selected component names', () => {
      const onChange = jest.fn();
      render(
        <I18nProvider>
          <StepComponents esDocsBase="https://docs" onChange={onChange} defaultValue={[]} />
        </I18nProvider>
      );

      fireEvent.click(screen.getByTestId('mockSelectSome'));

      const content = onChange.mock.calls[0][0];
      expect(content.isValid).toBe(true);
      expect(content.getData()).toEqual(['ct_1']);
    });
  });

  describe('WHEN defaultValue is provided', () => {
    it('SHOULD forward it to ComponentTemplatesSelector', () => {
      render(
        <I18nProvider>
          <StepComponents
            esDocsBase="https://docs"
            onChange={jest.fn()}
            defaultValue={['component_template@custom']}
          />
        </I18nProvider>
      );

      expect(screen.getByTestId('mockDefaultValue')).toHaveTextContent('component_template@custom');
    });
  });
});
