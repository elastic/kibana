/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import type { TemplateListItem as IndexTemplate } from '@kbn/index-management-shared-types';

import { CreateClassicStreamFlyout } from './create_classic_stream_flyout';

const createMockTemplate = (overrides: Partial<IndexTemplate> = {}): IndexTemplate => ({
  name: 'mock-template',
  indexPatterns: ['mock-*'],
  allowAutoCreate: 'NO_OVERWRITE',
  _kbnMeta: { type: 'default', hasDatastream: true },
  hasSettings: false,
  hasAliases: false,
  hasMappings: false,
  ...overrides,
});

const MOCK_TEMPLATES: IndexTemplate[] = [
  createMockTemplate({
    name: 'template-1',
    ilmPolicy: { name: '30d' },
    indexPatterns: ['logs-template-1-*'],
    indexMode: 'standard',
    composedOf: ['logs@mappings', 'logs@settings'],
  }),
  createMockTemplate({
    name: 'template-2',
    ilmPolicy: { name: '90d' },
    indexPatterns: ['template-2-*'],
    indexMode: 'logsdb',
    _kbnMeta: { type: 'managed', hasDatastream: true },
  }),
  createMockTemplate({
    name: 'template-3',
    indexPatterns: ['template-3-*'],
    lifecycle: { enabled: true, value: 30, unit: 'd' },
  }),
  createMockTemplate({
    name: 'multi-pattern-template',
    ilmPolicy: { name: 'logs' },
    indexPatterns: ['*-logs-*-*', 'logs-*-data-*', 'metrics-*'],
    indexMode: 'lookup',
    version: 12,
    composedOf: ['logs@mappings', 'logs@settings'],
    _kbnMeta: { type: 'managed', hasDatastream: true },
  }),
  createMockTemplate({
    name: 'very-long-pattern-template',
    ilmPolicy: { name: 'logs' },
    indexPatterns: ['*-reallllllllllllllllllly-*-loooooooooooong-*-index-*-name-*', 'short-*'],
    indexMode: 'lookup',
    version: 12,
    composedOf: ['logs@mappings', 'logs@settings'],
    _kbnMeta: { type: 'managed', hasDatastream: true },
  }),
];

const defaultProps = {
  onClose: jest.fn(),
  onCreate: jest.fn().mockResolvedValue(undefined),
  onCreateTemplate: jest.fn(),
  onRetryLoadTemplates: jest.fn(),
  templates: MOCK_TEMPLATES,
};

const renderFlyout = (props = {}) => {
  return render(
    <IntlProvider>
      <CreateClassicStreamFlyout {...defaultProps} {...props} />
    </IntlProvider>
  );
};

// Helper to select a template and navigate to second step
const selectTemplateAndGoToStep2 = (
  getByTestId: (id: string) => HTMLElement,
  templateName: string
) => {
  // Click on a template option
  const templateOption = getByTestId(`template-option-${templateName}`);
  fireEvent.click(templateOption);

  // Navigate to second step
  fireEvent.click(getByTestId('nextButton'));
};

describe('CreateClassicStreamFlyout', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the flyout with step navigation', () => {
      const { getByTestId } = renderFlyout();

      expect(getByTestId('create-classic-stream-flyout')).toBeInTheDocument();
      expect(getByTestId('createClassicStreamStep-selectTemplate')).toBeInTheDocument();
      expect(getByTestId('createClassicStreamStep-nameAndConfirm')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('navigates to second step when clicking Next button with selected template', () => {
      const { getByTestId, queryByTestId } = renderFlyout();

      // Select a template first
      fireEvent.click(getByTestId('template-option-template-1'));

      // Check that the first step content is rendered
      expect(getByTestId('selectTemplateStep')).toBeInTheDocument();
      expect(queryByTestId('nameAndConfirmStep')).not.toBeInTheDocument();

      // Verify that correct buttons are visible
      expect(getByTestId('cancelButton')).toBeInTheDocument();
      expect(getByTestId('nextButton')).toBeInTheDocument();
      expect(queryByTestId('backButton')).not.toBeInTheDocument();
      expect(queryByTestId('createButton')).not.toBeInTheDocument();

      // Click Next button
      fireEvent.click(getByTestId('nextButton'));

      // Verify that the second step content is rendered
      expect(queryByTestId('selectTemplateStep')).not.toBeInTheDocument();
      expect(getByTestId('nameAndConfirmStep')).toBeInTheDocument();

      // Verify that correct buttons are visible
      expect(getByTestId('backButton')).toBeInTheDocument();
      expect(getByTestId('createButton')).toBeInTheDocument();
      expect(queryByTestId('cancelButton')).not.toBeInTheDocument();
      expect(queryByTestId('nextButton')).not.toBeInTheDocument();
    });

    it('navigates back to first step when clicking Back button', () => {
      const { getByTestId, queryByTestId } = renderFlyout();

      // Select template and navigate to second step
      selectTemplateAndGoToStep2(getByTestId, 'template-1');

      // Verify that the second step content is rendered
      expect(queryByTestId('selectTemplateStep')).not.toBeInTheDocument();
      expect(getByTestId('nameAndConfirmStep')).toBeInTheDocument();

      // Verify that correct buttons are visible
      expect(getByTestId('backButton')).toBeInTheDocument();
      expect(getByTestId('createButton')).toBeInTheDocument();
      expect(queryByTestId('cancelButton')).not.toBeInTheDocument();
      expect(queryByTestId('nextButton')).not.toBeInTheDocument();

      // Navigate back
      fireEvent.click(getByTestId('backButton'));

      // Verify that the first step content is rendered
      expect(getByTestId('selectTemplateStep')).toBeInTheDocument();
      expect(queryByTestId('nameAndConfirmStep')).not.toBeInTheDocument();

      // Verify that correct buttons are visible
      expect(getByTestId('cancelButton')).toBeInTheDocument();
      expect(getByTestId('nextButton')).toBeInTheDocument();
      expect(queryByTestId('backButton')).not.toBeInTheDocument();
      expect(queryByTestId('createButton')).not.toBeInTheDocument();
    });
  });

  describe('callback functions', () => {
    it('calls onClose when Cancel button or close flyout button is clicked', () => {
      const onClose = jest.fn();
      const { getByTestId } = renderFlyout({ onClose });

      fireEvent.click(getByTestId('cancelButton'));

      expect(onClose).toHaveBeenCalledTimes(1);

      fireEvent.click(getByTestId('euiFlyoutCloseButton'));

      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('calls onCreate with stream name when Create button is clicked and validation passes', async () => {
      const onCreate = jest.fn().mockResolvedValue(undefined);
      const { getByTestId } = renderFlyout({ onCreate });

      // Select template and navigate to second step
      selectTemplateAndGoToStep2(getByTestId, 'template-1');

      // Fill in the stream name (pattern is logs-template-1-*)
      const streamNameInput = getByTestId('streamNameInput-wildcard-0');
      fireEvent.change(streamNameInput, { target: { value: 'mystream' } });

      // Click Create button
      fireEvent.click(getByTestId('createButton'));

      // Wait for validation to complete
      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledTimes(1);
        expect(onCreate).toHaveBeenCalledWith('logs-template-1-mystream');
      });
    });

    it('does not call onCreate when validation fails (empty wildcard)', async () => {
      const onCreate = jest.fn().mockResolvedValue(undefined);
      const { getByTestId, findByText } = renderFlyout({ onCreate });

      // Select template and navigate to second step
      selectTemplateAndGoToStep2(getByTestId, 'template-1');

      // Don't fill in the stream name (leave wildcard empty)

      // Click Create button
      fireEvent.click(getByTestId('createButton'));

      // Wait for validation error to appear
      await findByText(/You must specify a valid text string for all wildcards/i);

      expect(onCreate).not.toHaveBeenCalled();
    });

    it('does not call onCreate or onClose when navigating between steps', () => {
      const onClose = jest.fn();
      const onCreate = jest.fn().mockResolvedValue(undefined);
      const { getByTestId } = renderFlyout({ onCreate, onClose });

      // Select template
      fireEvent.click(getByTestId('template-option-template-1'));

      // Navigate forward
      fireEvent.click(getByTestId('nextButton'));
      expect(onCreate).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();

      // Navigate back
      fireEvent.click(getByTestId('backButton'));
      expect(onCreate).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('select template step', () => {
    it('renders the select template step', () => {
      const { getByTestId } = renderFlyout();

      // Check that the select template step is rendered
      expect(getByTestId('selectTemplateStep')).toBeInTheDocument();

      // Check that the template search is rendered
      expect(getByTestId('templateSearch')).toBeInTheDocument();

      // Check that the template options are rendered
      expect(getByTestId('template-option-template-1')).toBeInTheDocument();
      expect(getByTestId('template-option-template-2')).toBeInTheDocument();
      expect(getByTestId('template-option-template-3')).toBeInTheDocument();
      expect(getByTestId('template-option-multi-pattern-template')).toBeInTheDocument();
      expect(getByTestId('template-option-very-long-pattern-template')).toBeInTheDocument();
    });

    describe('empty state', () => {
      it('renders empty state when there are no templates', () => {
        const onCreateTemplate = jest.fn();
        const { getByText, getByTestId } = renderFlyout({ templates: [], onCreateTemplate });

        expect(getByText('No index templates detected')).toBeInTheDocument();
        expect(
          getByText(/Classic streams require an index template to set their initial settings/i)
        ).toBeInTheDocument();
        expect(getByTestId('createTemplateButton')).toBeInTheDocument();
      });

      it('calls onCreateTemplate when Create index template button is clicked', () => {
        const onCreateTemplate = jest.fn();
        const { getByTestId } = renderFlyout({ templates: [], onCreateTemplate });

        fireEvent.click(getByTestId('createTemplateButton'));

        expect(onCreateTemplate).toHaveBeenCalledTimes(1);
      });
    });

    describe('error state', () => {
      it('renders error state when hasErrorLoadingTemplates is true', () => {
        const { getByTestId, getByText } = renderFlyout({
          hasErrorLoadingTemplates: true,
        });

        expect(getByTestId('errorLoadingTemplates')).toBeInTheDocument();
        expect(getByText("We couldn't fetch your index templates")).toBeInTheDocument();
      });

      it('calls onRetryLoadTemplates when Retry button is clicked', () => {
        const onRetryLoadTemplates = jest.fn();
        const { getByTestId } = renderFlyout({
          hasErrorLoadingTemplates: true,
          onRetryLoadTemplates,
        });

        fireEvent.click(getByTestId('retryLoadTemplatesButton'));

        expect(onRetryLoadTemplates).toHaveBeenCalledTimes(1);
      });
    });
    describe('template selection', () => {
      it('disables next step and Next button when no template is selected', () => {
        const { getByTestId } = renderFlyout();

        const nextStep = getByTestId('createClassicStreamStep-nameAndConfirm');
        expect(nextStep).toBeDisabled();

        const nextButton = getByTestId('nextButton');
        expect(nextButton).toBeDisabled();
      });

      it('enables next step and Next button when a template is selected', () => {
        const { getByTestId } = renderFlyout();

        // Select a template
        fireEvent.click(getByTestId('template-option-template-1'));

        const nextStep = getByTestId('createClassicStreamStep-nameAndConfirm');
        expect(nextStep).toBeEnabled();

        const nextButton = getByTestId('nextButton');
        expect(nextButton).toBeEnabled();
      });

      it('displays ILM badge for templates with ILM policy', () => {
        const { getAllByText, getByText } = renderFlyout();

        // template-1 has ilmPolicy: { name: '30d' }, template-2 has ilmPolicy: { name: '90d' }
        // Both should display ILM badge
        const ilmBadges = getAllByText('ILM');
        expect(ilmBadges.length).toBeGreaterThanOrEqual(2);
        expect(getByText('90d')).toBeInTheDocument();
      });

      it('displays lifecycle data retention for templates without ILM policy', () => {
        const { getByTestId } = renderFlyout();

        // template-3 has lifecycle: { enabled: true, value: 30, unit: 'd' } but no ILM
        // Should display the retention period in the template option
        const templateOption = getByTestId('template-option-template-3');
        expect(templateOption).toBeInTheDocument();
      });

      it('renders all template options including managed templates', () => {
        const { getByTestId } = renderFlyout();

        // Verify all templates are rendered, including managed template-2
        expect(getByTestId('template-option-template-1')).toBeInTheDocument();
        expect(getByTestId('template-option-template-2')).toBeInTheDocument();
        expect(getByTestId('template-option-template-3')).toBeInTheDocument();
      });
    });
  });

  describe('name and confirm step', () => {
    it('renders the name and confirm step with template details', () => {
      const { getByTestId, getByText } = renderFlyout();

      // Select template and navigate to second step
      selectTemplateAndGoToStep2(getByTestId, 'template-1');

      // Check step content is rendered
      expect(getByTestId('nameAndConfirmStep')).toBeInTheDocument();

      // Check section titles
      expect(getByText('Name classic stream')).toBeInTheDocument();
      expect(getByText('Confirm index template details')).toBeInTheDocument();

      // Check template details are displayed
      expect(getByTestId('templateDetails')).toBeInTheDocument();
      expect(getByText('Index mode')).toBeInTheDocument();
      expect(getByText('Standard')).toBeInTheDocument();
      expect(getByText('Component templates')).toBeInTheDocument();
    });

    it('displays the index pattern prefix as prepend text', () => {
      const { getByTestId, getByText } = renderFlyout();

      // Select template and navigate to second step
      selectTemplateAndGoToStep2(getByTestId, 'template-1');

      // Check the wildcard input exists
      const wildcardInput = getByTestId('streamNameInput-wildcard-0');
      expect(wildcardInput).toBeInTheDocument();

      // Check the static prefix is displayed as prepend text
      // template-1 has indexPatterns: ['logs-template-1-*']
      expect(getByText('logs-template-1-')).toBeInTheDocument();
    });

    it('allows editing the stream name input', () => {
      const { getByTestId } = renderFlyout();

      // Select template and navigate to second step
      selectTemplateAndGoToStep2(getByTestId, 'template-1');

      // Check the editable input
      const streamNameInput = getByTestId('streamNameInput-wildcard-0');
      expect(streamNameInput).toBeInTheDocument();

      // Change the input value
      fireEvent.change(streamNameInput, { target: { value: 'my-stream' } });
      expect(streamNameInput).toHaveValue('my-stream');
    });

    it('displays component templates as separate lines', () => {
      const { getByTestId, getByText } = renderFlyout();

      // Select template and navigate to second step
      selectTemplateAndGoToStep2(getByTestId, 'template-1');

      // template-1 has composedOf: ['logs@mappings', 'logs@settings']
      // Component templates are displayed as block elements (each on its own line)
      expect(getByText('logs@mappings')).toBeInTheDocument();
      expect(getByText('logs@settings')).toBeInTheDocument();
    });

    it('displays correct index mode for different templates', () => {
      const { getByTestId, getByText } = renderFlyout();

      // Select template-2 and navigate to second step
      selectTemplateAndGoToStep2(getByTestId, 'template-2');

      // template-2 has indexMode: 'logsdb'
      expect(getByText('LogsDB')).toBeInTheDocument();
    });

    it('displays version when available', () => {
      const { getByTestId, getByText } = renderFlyout();

      // Select template and navigate to second step
      selectTemplateAndGoToStep2(getByTestId, 'multi-pattern-template');

      // multi-pattern-template has version: 12
      expect(getByText('Version')).toBeInTheDocument();
      expect(getByText('12')).toBeInTheDocument();
    });

    describe('multiple index patterns', () => {
      it('shows index pattern selector when template has multiple patterns', () => {
        const { getByTestId } = renderFlyout();

        // Select template and navigate to second step
        selectTemplateAndGoToStep2(getByTestId, 'multi-pattern-template');

        // Should show index pattern selector
        expect(getByTestId('indexPatternSelect')).toBeInTheDocument();
      });

      it('does not show index pattern selector when template has single pattern', () => {
        const { getByTestId, queryByTestId } = renderFlyout();

        // Select template and navigate to second step
        selectTemplateAndGoToStep2(getByTestId, 'template-1');

        // Should NOT show index pattern selector
        expect(queryByTestId('indexPatternSelect')).not.toBeInTheDocument();
      });

      it('updates stream name input when index pattern is changed', () => {
        const { getByTestId, queryByTestId, getByText } = renderFlyout();

        // Select template and navigate to second step
        selectTemplateAndGoToStep2(getByTestId, 'multi-pattern-template');

        // Default pattern is '*-logs-*-*' which has 3 wildcards
        expect(getByTestId('streamNameInput-wildcard-0')).toBeInTheDocument();
        expect(getByTestId('streamNameInput-wildcard-1')).toBeInTheDocument();
        expect(getByTestId('streamNameInput-wildcard-2')).toBeInTheDocument();

        // Change to 'metrics-*' which has only 1 wildcard
        const patternSelect = getByTestId('indexPatternSelect');
        fireEvent.change(patternSelect, { target: { value: 'metrics-*' } });

        // Should now have only 1 editable input
        expect(getByTestId('streamNameInput-wildcard-0')).toBeInTheDocument();
        expect(queryByTestId('streamNameInput-wildcard-1')).not.toBeInTheDocument();

        // Should have static prefix 'metrics-' as prepend text
        expect(getByText('metrics-')).toBeInTheDocument();
      });
    });

    describe('stream name reset on template change', () => {
      it('resets stream name inputs when going back and selecting a different template', () => {
        const { getByTestId } = renderFlyout();

        // Select template-1 and navigate to second step
        selectTemplateAndGoToStep2(getByTestId, 'template-1');

        // Fill in the stream name
        const streamNameInput = getByTestId('streamNameInput-wildcard-0');
        fireEvent.change(streamNameInput, { target: { value: 'my-value' } });
        expect(streamNameInput).toHaveValue('my-value');

        // Go back
        fireEvent.click(getByTestId('backButton'));

        // Select a different template
        fireEvent.click(getByTestId('template-option-template-2'));

        // Navigate to second step again
        fireEvent.click(getByTestId('nextButton'));

        // The input should be reset (empty)
        const newInput = getByTestId('streamNameInput-wildcard-0');
        expect(newInput).toHaveValue('');
      });
    });

    describe('validation', () => {
      it('shows validation error when trying to create with empty wildcard', async () => {
        const onCreate = jest.fn().mockResolvedValue(undefined);
        const { getByTestId, findByText } = renderFlyout({ onCreate });

        // Select template and navigate to second step
        selectTemplateAndGoToStep2(getByTestId, 'template-1');

        // Click Create without filling in the wildcard
        fireEvent.click(getByTestId('createButton'));

        // Should show validation error
        await findByText(/You must specify a valid text string for all wildcards/i);

        // onCreate should not be called
        expect(onCreate).not.toHaveBeenCalled();
      });

      it('calls onValidate when provided and local validation passes', async () => {
        const onCreate = jest.fn().mockResolvedValue(undefined);
        const onValidate = jest.fn().mockResolvedValue({ errorType: null });
        const { getByTestId } = renderFlyout({ onCreate, onValidate });

        // Select template and navigate to second step
        selectTemplateAndGoToStep2(getByTestId, 'template-1');

        // Fill in the stream name
        const streamNameInput = getByTestId('streamNameInput-wildcard-0');
        fireEvent.change(streamNameInput, { target: { value: 'mystream' } });

        // Click Create
        fireEvent.click(getByTestId('createButton'));

        // Wait for validation
        await waitFor(() => {
          expect(onValidate).toHaveBeenCalledWith(
            'logs-template-1-mystream',
            expect.objectContaining({
              name: 'template-1',
              indexPatterns: ['logs-template-1-*'],
            }),
            expect.any(AbortSignal)
          );
          expect(onCreate).toHaveBeenCalledWith('logs-template-1-mystream');
        });
      });

      it('shows duplicate error from onValidate', async () => {
        const onCreate = jest.fn().mockResolvedValue(undefined);
        const onValidate = jest.fn().mockResolvedValue({ errorType: 'duplicate' });
        const { getByTestId, findByText } = renderFlyout({ onCreate, onValidate });

        // Select template and navigate to second step
        selectTemplateAndGoToStep2(getByTestId, 'template-1');

        // Fill in the stream name
        const streamNameInput = getByTestId('streamNameInput-wildcard-0');
        fireEvent.change(streamNameInput, { target: { value: 'existing' } });

        // Click Create
        fireEvent.click(getByTestId('createButton'));

        // Should show duplicate error
        await findByText(/This stream name already exists/i);

        // onCreate should not be called
        expect(onCreate).not.toHaveBeenCalled();
      });

      it('shows higher priority error from onValidate', async () => {
        const onCreate = jest.fn().mockResolvedValue(undefined);
        const onValidate = jest.fn().mockResolvedValue({
          errorType: 'higherPriority',
          conflictingIndexPattern: 'logs-*',
        });
        const { getByTestId, findByText, getByText } = renderFlyout({ onCreate, onValidate });

        // Select template and navigate to second step
        selectTemplateAndGoToStep2(getByTestId, 'template-1');

        // Fill in the stream name
        const streamNameInput = getByTestId('streamNameInput-wildcard-0');
        fireEvent.change(streamNameInput, { target: { value: 'conflict' } });

        // Click Create
        fireEvent.click(getByTestId('createButton'));

        // Should show higher priority error
        await findByText(/matches a higher priority index template/i);
        expect(getByText('logs-*')).toBeInTheDocument();

        // onCreate should not be called
        expect(onCreate).not.toHaveBeenCalled();
      });
    });

    describe('debounced validation and live validation mode', () => {
      it('should trigger debounced validation in Live Validation Mode (when error exists)', async () => {
        const onCreate = jest.fn().mockResolvedValue(undefined);
        // Return error to enter Live Validation Mode
        const onValidate = jest.fn().mockResolvedValue({ errorType: 'duplicate' });
        const { getByTestId, findByText } = renderFlyout({ onCreate, onValidate });

        selectTemplateAndGoToStep2(getByTestId, 'template-1');

        const streamNameInput = getByTestId('streamNameInput-wildcard-0');
        fireEvent.change(streamNameInput, { target: { value: 'mystream' } });

        // Click Create to trigger first submit - will return error
        fireEvent.click(getByTestId('createButton'));

        // Wait for error to appear (confirms we're in Live Validation Mode)
        await findByText(/This stream name already exists/i);

        onValidate.mockClear();

        // Now type something new - should trigger debounced validation (Live Validation Mode due to error)
        fireEvent.change(streamNameInput, { target: { value: 'newstream' } });

        // Wait for debounced validation
        await waitFor(() => {
          expect(onValidate).toHaveBeenCalledWith(
            'logs-template-1-newstream',
            expect.objectContaining({
              name: 'template-1',
              indexPatterns: ['logs-template-1-*'],
            }),
            expect.any(AbortSignal)
          );
        });
      });

      it('should keep error visible while validating in Live Validation Mode', async () => {
        const onCreate = jest.fn().mockResolvedValue(undefined);
        const onValidate = jest.fn().mockResolvedValue({ errorType: 'duplicate' });
        const { getByTestId, findByText, getByText } = renderFlyout({ onCreate, onValidate });

        selectTemplateAndGoToStep2(getByTestId, 'template-1');

        const streamNameInput = getByTestId('streamNameInput-wildcard-0');
        fireEvent.change(streamNameInput, { target: { value: 'duplicate' } });

        // Click Create - should show error
        fireEvent.click(getByTestId('createButton'));

        await findByText(/This stream name already exists/i);

        // Start typing - error should stay visible while validating (Live Validation Mode)
        fireEvent.change(streamNameInput, { target: { value: 'new' } });

        // Error should still be visible (not cleared immediately)
        expect(getByText(/This stream name already exists/i)).toBeInTheDocument();
      });
    });

    describe('AbortController cancellation', () => {
      it('should abort validation when template changes', async () => {
        const onCreate = jest.fn().mockResolvedValue(undefined);
        let abortSignal: AbortSignal | undefined;

        const onValidate = jest.fn().mockImplementation((name, template, signal) => {
          abortSignal = signal;
          return new Promise((resolve) => {
            setTimeout(() => resolve({ errorType: null }), 10000);
          });
        });

        const { getByTestId } = renderFlyout({ onCreate, onValidate });

        selectTemplateAndGoToStep2(getByTestId, 'template-1');

        const streamNameInput = getByTestId('streamNameInput-wildcard-0');
        fireEvent.change(streamNameInput, { target: { value: 'mystream' } });

        // Click Create - starts validation
        fireEvent.click(getByTestId('createButton'));

        await waitFor(() => {
          expect(onValidate).toHaveBeenCalled();
          expect(abortSignal).toBeDefined();
        });

        // Go back and change template - should abort validation
        fireEvent.click(getByTestId('backButton'));
        fireEvent.click(getByTestId('template-option-template-2'));

        await waitFor(() => {
          expect(abortSignal?.aborted).toBe(true);
        });
      });
    });

    describe('template and index pattern change effects', () => {
      it('should reset validation error state when template changes', async () => {
        const onCreate = jest.fn().mockResolvedValue(undefined);
        const onValidate = jest.fn().mockResolvedValue({ errorType: 'duplicate' });
        const { getByTestId, findByText, queryByText } = renderFlyout({ onCreate, onValidate });

        selectTemplateAndGoToStep2(getByTestId, 'template-1');

        const streamNameInput = getByTestId('streamNameInput-wildcard-0');
        fireEvent.change(streamNameInput, { target: { value: 'test' } });

        // Click Create - shows error
        fireEvent.click(getByTestId('createButton'));

        await findByText(/This stream name already exists/i);

        // Go back and change template
        fireEvent.click(getByTestId('backButton'));
        fireEvent.click(getByTestId('template-option-template-2'));
        fireEvent.click(getByTestId('nextButton'));

        // Validation error should be cleared (stream name reset is tested in existing test above)
        await waitFor(() => {
          expect(queryByText(/This stream name already exists/i)).not.toBeInTheDocument();
        });

        // Ensure debounced validation doesn't bring it back
        await act(async () => {
          jest.advanceTimersByTime(500);
        });
        expect(queryByText(/You must specify a valid text string/i)).not.toBeInTheDocument();
      });

      it('should reset validation when index pattern changes', async () => {
        const onCreate = jest.fn().mockResolvedValue(undefined);
        const onValidate = jest.fn().mockResolvedValue({ errorType: 'duplicate' });
        const { getByTestId, findByText, queryByText } = renderFlyout({ onCreate, onValidate });

        selectTemplateAndGoToStep2(getByTestId, 'multi-pattern-template');

        // Fill in all wildcards for '*-logs-*-*' pattern (3 wildcards)
        fireEvent.change(getByTestId('streamNameInput-wildcard-0'), { target: { value: 'test' } });
        fireEvent.change(getByTestId('streamNameInput-wildcard-1'), { target: { value: 'data' } });
        fireEvent.change(getByTestId('streamNameInput-wildcard-2'), {
          target: { value: 'stream' },
        });

        // Click Create - shows error
        fireEvent.click(getByTestId('createButton'));

        // Wait for error to appear (confirms we're in Live Validation Mode)
        await findByText(/This stream name already exists/i);

        // Change index pattern - this should clear the error
        const patternSelect = getByTestId('indexPatternSelect');
        fireEvent.change(patternSelect, { target: { value: 'metrics-*' } });

        // Error should be cleared immediately
        expect(queryByText(/This stream name already exists/i)).not.toBeInTheDocument();

        // Ensure debounced validation doesn't bring it back
        await act(async () => {
          jest.advanceTimersByTime(500);
        });
        expect(queryByText(/You must specify a valid text string/i)).not.toBeInTheDocument();
      });
    });

    describe('error handling', () => {
      it('should handle validation errors gracefully', async () => {
        const onCreate = jest.fn().mockResolvedValue(undefined);
        const onValidate = jest.fn().mockRejectedValue(new Error('Network error'));

        const { getByTestId } = renderFlyout({ onCreate, onValidate });

        selectTemplateAndGoToStep2(getByTestId, 'template-1');

        const streamNameInput = getByTestId('streamNameInput-wildcard-0');
        fireEvent.change(streamNameInput, { target: { value: 'mystream' } });

        // Click Create
        fireEvent.click(getByTestId('createButton'));

        await waitFor(() => {
          // Component should not crash and button should re-enable
          const createButton = getByTestId('createButton');
          expect(createButton).not.toBeDisabled();
        });

        // onCreate should not be called
        expect(onCreate).not.toHaveBeenCalled();
      });
    });

    describe('validation state management', () => {
      it('should show loading state during validation', async () => {
        const onCreate = jest.fn().mockResolvedValue(undefined);
        const onValidate = jest.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(() => resolve({ errorType: null }), 100);
          });
        });

        const { getByTestId } = renderFlyout({ onCreate, onValidate });

        selectTemplateAndGoToStep2(getByTestId, 'template-1');

        const streamNameInput = getByTestId('streamNameInput-wildcard-0');
        fireEvent.change(streamNameInput, { target: { value: 'mystream' } });

        // Click Create
        fireEvent.click(getByTestId('createButton'));

        // Button should show loading state (disabled) during validation
        const createButton = getByTestId('createButton');
        await waitFor(() => {
          expect(createButton).toBeDisabled();
        });

        // Wait for validation to complete
        await waitFor(() => {
          expect(onCreate).toHaveBeenCalled();
        });

        // Button should be enabled again after validation completes
        await waitFor(() => {
          expect(createButton).toBeEnabled();
        });
      });

      it('should reset hasAttemptedSubmit when validation passes in live mode', async () => {
        const onCreate = jest.fn().mockResolvedValue(undefined);
        // First return error to enter Live Validation Mode
        const onValidate = jest.fn().mockResolvedValue({ errorType: 'duplicate' });
        const { getByTestId, findByText } = renderFlyout({ onCreate, onValidate });

        selectTemplateAndGoToStep2(getByTestId, 'template-1');

        const streamNameInput = getByTestId('streamNameInput-wildcard-0');
        fireEvent.change(streamNameInput, { target: { value: 'invalid' } });

        // Click Create - enters live validation mode with error
        fireEvent.click(getByTestId('createButton'));

        // Wait for error to appear (confirms we're in Live Validation Mode)
        await findByText(/This stream name already exists/i);

        // Change to valid name - should trigger debounced validation (Live Validation Mode)
        onValidate.mockResolvedValueOnce({ errorType: null });
        fireEvent.change(streamNameInput, { target: { value: 'valid' } });

        // Wait for debounced validation to complete
        await waitFor(() => {
          expect(onValidate).toHaveBeenCalledWith(
            'logs-template-1-valid',
            expect.objectContaining({
              name: 'template-1',
              indexPatterns: ['logs-template-1-*'],
            }),
            expect.any(AbortSignal)
          );
        });

        // Clear mock to track new calls
        onValidate.mockClear();

        // Change input - should NOT trigger validation (exited Live Validation Mode - no error)
        fireEvent.change(streamNameInput, { target: { value: 'another' } });

        // Advance timers - validation should not trigger
        await act(async () => {
          await jest.advanceTimersByTimeAsync(300);
        });

        // Should not validate again (hasAttemptedSubmit was reset to false)
        expect(onValidate).not.toHaveBeenCalled();
      });
    });
  });

  describe('showDataRetention prop', () => {
    describe('select template step', () => {
      it('hides ILM badge and policy name when showDataRetention is false', () => {
        const { queryAllByText, queryByText, getByTestId } = renderFlyout({
          showDataRetention: false,
        });

        // template-1 and template-2 have ILM policies, but badges should be hidden
        expect(queryAllByText('ILM')).toHaveLength(0);

        // ILM policy names should also be hidden
        expect(queryByText('30d')).not.toBeInTheDocument();
        expect(queryByText('90d')).not.toBeInTheDocument();

        // Template options should still be visible
        expect(getByTestId('template-option-template-1')).toBeInTheDocument();
        expect(getByTestId('template-option-template-2')).toBeInTheDocument();
      });

      it('hides data retention text when showDataRetention is false', () => {
        const { queryByText } = renderFlyout({ showDataRetention: false });

        // template-3 has lifecycle: { enabled: true, value: 30, unit: 'd' } - retention text should be hidden
        // ILM policy names should also be hidden
        expect(queryByText('30d')).not.toBeInTheDocument();
        expect(queryByText('90d')).not.toBeInTheDocument();
      });

      it('shows ILM badge when showDataRetention is true (default)', () => {
        const { getAllByText } = renderFlyout();

        // template-1 and template-2 have ILM policies - badges should be visible
        const ilmBadges = getAllByText('ILM');
        expect(ilmBadges.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('name and confirm step', () => {
      it('hides retention section when showDataRetention is false', () => {
        const { getByTestId, queryByText } = renderFlyout({ showDataRetention: false });

        // Select template with ILM policy and navigate to second step
        selectTemplateAndGoToStep2(getByTestId, 'template-1');

        // Retention should be hidden
        expect(queryByText('Retention')).not.toBeInTheDocument();
        expect(queryByText('30d')).not.toBeInTheDocument();
        expect(queryByText('ILM')).not.toBeInTheDocument();

        // Other template details should still be visible
        expect(queryByText('Index mode')).toBeInTheDocument();
        expect(queryByText('Component templates')).toBeInTheDocument();
      });

      it('does not call getIlmPolicy when showDataRetention is false', () => {
        const mockGetIlmPolicy = jest.fn().mockResolvedValue(null);
        const { getByTestId } = renderFlyout({
          showDataRetention: false,
          getIlmPolicy: mockGetIlmPolicy,
        });

        // Select template with ILM policy and navigate to second step
        selectTemplateAndGoToStep2(getByTestId, 'template-1');

        // Verify we're on the second step
        expect(getByTestId('nameAndConfirmStep')).toBeInTheDocument();

        // getIlmPolicy should not be called
        expect(mockGetIlmPolicy).not.toHaveBeenCalled();
      });

      it('shows retention section and calls getIlmPolicy when showDataRetention is true', async () => {
        const mockGetIlmPolicy = jest.fn().mockResolvedValue(null);
        const { getByTestId, getByText } = renderFlyout({
          showDataRetention: true,
          getIlmPolicy: mockGetIlmPolicy,
        });

        // Select template with ILM policy and navigate to second step
        selectTemplateAndGoToStep2(getByTestId, 'template-1');

        // Retention should be visible
        expect(getByText('Retention')).toBeInTheDocument();

        // getIlmPolicy should be called
        await waitFor(() => {
          expect(mockGetIlmPolicy).toHaveBeenCalledWith('30d', expect.any(AbortSignal));
        });
      });
    });
  });

  describe('ILM policy fetching integration', () => {
    // Note: Basic ILM policy fetching, loading states, error handling, and abort signal tests
    // are covered in confirm_template_details_section.test.tsx.
    // These tests focus on navigation-specific integration behavior.

    it('should abort ILM policy fetch when going back to template selection', async () => {
      let capturedSignal: AbortSignal | undefined;
      const mockGetIlmPolicy = jest.fn().mockImplementation((policyName, signal) => {
        capturedSignal = signal;
        return new Promise((resolve) => {
          setTimeout(() => resolve(null), 10000);
        });
      });

      const { getByTestId } = renderFlyout({ getIlmPolicy: mockGetIlmPolicy });

      // Select template with ILM policy and navigate to second step
      selectTemplateAndGoToStep2(getByTestId, 'template-1');

      await waitFor(() => {
        expect(mockGetIlmPolicy).toHaveBeenCalled();
        expect(capturedSignal).toBeDefined();
      });

      // Go back - should abort the fetch
      fireEvent.click(getByTestId('backButton'));

      await waitFor(() => {
        expect(capturedSignal?.aborted).toBe(true);
      });
    });

    it('should abort previous ILM policy fetch when switching templates via navigation', async () => {
      let firstSignal: AbortSignal | undefined;
      let secondSignal: AbortSignal | undefined;
      let callCount = 0;

      const mockGetIlmPolicy = jest.fn().mockImplementation((policyName, signal) => {
        callCount++;
        if (callCount === 1) {
          firstSignal = signal;
        } else if (callCount === 2) {
          secondSignal = signal;
        }
        return new Promise((resolve) => {
          setTimeout(() => resolve(null), 10000);
        });
      });

      const { getByTestId } = renderFlyout({ getIlmPolicy: mockGetIlmPolicy });

      // Select template-1 and navigate to second step
      selectTemplateAndGoToStep2(getByTestId, 'template-1');

      await waitFor(() => {
        expect(mockGetIlmPolicy).toHaveBeenCalledTimes(1);
        expect(firstSignal).toBeDefined();
      });

      // Go back and select template-2
      fireEvent.click(getByTestId('backButton'));
      fireEvent.click(getByTestId('template-option-template-2'));
      fireEvent.click(getByTestId('nextButton'));

      await waitFor(() => {
        expect(mockGetIlmPolicy).toHaveBeenCalledTimes(2);
        expect(firstSignal?.aborted).toBe(true);
        expect(secondSignal).toBeDefined();
      });
    });
  });
});
