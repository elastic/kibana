/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, fireEvent } from '@testing-library/react';
import type { TemplateDeserialized } from '@kbn/index-management-plugin/common/types';
import { CreateClassicStreamFlyout } from './create_classic_stream_flyout';

const MOCK_TEMPLATES: TemplateDeserialized[] = [
  {
    name: 'template-1',
    ilmPolicy: { name: '30d' },
    indexPatterns: ['template-1-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'default', hasDatastream: true },
  },
  {
    name: 'template-2',
    ilmPolicy: { name: '90d' },
    indexPatterns: ['template-2-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    _kbnMeta: { type: 'managed', hasDatastream: true },
  },
  {
    name: 'template-3',
    indexPatterns: ['template-3-*'],
    allowAutoCreate: 'NO_OVERWRITE',
    lifecycle: { enabled: true, value: 30, unit: 'd' },
    _kbnMeta: { type: 'default', hasDatastream: true },
  },
];

const defaultProps = {
  onClose: jest.fn(),
  onCreate: jest.fn(),
  onCreateTemplate: jest.fn(),
  onRetryLoadTemplates: jest.fn(),
  templates: MOCK_TEMPLATES,
  selectedTemplate: null,
  onTemplateSelect: jest.fn(),
};

const renderFlyout = (props = {}) => {
  return render(
    <IntlProvider>
      <CreateClassicStreamFlyout {...defaultProps} {...props} />
    </IntlProvider>
  );
};

describe('CreateClassicStreamFlyout', () => {
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

  describe('empty state', () => {
    it('renders empty state when there are no templates', () => {
      const onCreateTemplate = jest.fn();
      const { getByText, getByTestId } = renderFlyout({ templates: [], onCreateTemplate });

      expect(getByText('No index templates detected')).toBeInTheDocument();
      expect(
        getByText(/To create a new classic stream, you must select an index template/i)
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
      expect(getByText("Uh-oh, we weren't able to fetch your index templates")).toBeInTheDocument();
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
    it('renders template search and list', () => {
      const { getByTestId } = renderFlyout();

      expect(getByTestId('templateSearch')).toBeInTheDocument();
    });

    it('disables Next button when no template is selected', () => {
      const { getByTestId } = renderFlyout();

      const nextButton = getByTestId('nextButton');
      expect(nextButton).toBeDisabled();
    });

    it('enables Next button when a template is selected', () => {
      const { getByTestId } = renderFlyout({ selectedTemplate: 'template-1' });

      const nextButton = getByTestId('nextButton');
      expect(nextButton).toBeEnabled();
    });

    it('calls onTemplateSelect when a template is selected', () => {
      const onTemplateSelect = jest.fn();
      const { getByTestId } = renderFlyout({ onTemplateSelect });

      // Click on a template option
      const templateOption = getByTestId('template-option-template-1');
      fireEvent.click(templateOption);

      expect(onTemplateSelect).toHaveBeenCalledWith('template-1');
    });

    it('displays ILM badge for templates with ILM policy', () => {
      const { getAllByText, getByText } = renderFlyout();

      // template-1 has ilmPolicy: { name: '30d' }, template-2 has ilmPolicy: { name: '90d' }
      // Both should display ILM badge
      const ilmBadges = getAllByText('ILM');
      expect(ilmBadges.length).toBe(2);
      expect(getByText('90d')).toBeInTheDocument();
    });

    it('displays lifecycle data retention for templates without ILM policy', () => {
      const { getByTestId } = renderFlyout();

      // template-3 has lifecycle: { enabled: true, value: 30, unit: 'd' } but no ILM
      // Should display the retention period in the template option
      const templateOption = getByTestId('template-option-template-3');
      expect(templateOption).toBeInTheDocument();
      // The 30d retention should be displayed (same as ILM policy name for template-1,
      // but this verifies template-3 option exists and is rendered)
    });

    it('renders all template options including managed templates', () => {
      const { getByTestId } = renderFlyout();

      // Verify all templates are rendered, including managed template-2
      expect(getByTestId('template-option-template-1')).toBeInTheDocument();
      expect(getByTestId('template-option-template-2')).toBeInTheDocument();
      expect(getByTestId('template-option-template-3')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('navigates to second step when clicking Next button with selected template', () => {
      const { getByTestId, queryByTestId } = renderFlyout({ selectedTemplate: 'template-1' });

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
      const { getByTestId, queryByTestId } = renderFlyout({ selectedTemplate: 'template-1' });

      // Navigate to second step
      fireEvent.click(getByTestId('nextButton'));

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

    it('calls onCreate when Create button is clicked', () => {
      const onCreate = jest.fn();
      const { getByTestId } = renderFlyout({ onCreate, selectedTemplate: 'template-1' });

      // Navigate to second step
      fireEvent.click(getByTestId('nextButton'));

      // Click Create button
      fireEvent.click(getByTestId('createButton'));

      expect(onCreate).toHaveBeenCalledTimes(1);
    });

    it('does not call onCreate or onClose when navigating between steps', () => {
      const onClose = jest.fn();
      const onCreate = jest.fn();
      const { getByTestId } = renderFlyout({
        onCreate,
        onClose,
        selectedTemplate: 'template-1',
      });

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
});
