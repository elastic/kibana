/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, fireEvent } from '@testing-library/react';
import { CreateClassicStreamFlyout, type IndexTemplate } from './create_classic_stream_flyout';

const MOCK_TEMPLATES: IndexTemplate[] = [
  { name: 'template-1', ilmPolicy: { name: '30d' }, indexPatterns: ['template-1-*'] },
  { name: 'template-2', ilmPolicy: { name: '90d' }, indexPatterns: ['template-2-*'] },
  { name: 'template-3', indexPatterns: ['template-3-*'] },
];

const defaultProps = {
  onClose: jest.fn(),
  onCreate: jest.fn(),
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

    it('does not render Create index template button when onCreateTemplate is not provided', () => {
      const { getByText, queryByTestId } = renderFlyout({
        templates: [],
        onCreateTemplate: undefined,
      });

      expect(getByText('No index templates detected')).toBeInTheDocument();
      expect(queryByTestId('createTemplateButton')).not.toBeInTheDocument();
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
