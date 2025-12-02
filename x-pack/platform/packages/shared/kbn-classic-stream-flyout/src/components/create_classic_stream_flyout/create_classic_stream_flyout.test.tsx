/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, fireEvent } from '@testing-library/react';
import { CreateClassicStreamFlyout } from './create_classic_stream_flyout';

const defaultProps = {
  onClose: jest.fn(),
  onCreate: jest.fn(),
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

  describe('navigation', () => {
    it('navigates to second step when clicking Next button', () => {
      const { getByTestId, queryByTestId } = renderFlyout();

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
      const { getByTestId } = renderFlyout({ onCreate });

      // Navigate to second step
      fireEvent.click(getByTestId('nextButton'));

      // Click Create button
      fireEvent.click(getByTestId('createButton'));

      expect(onCreate).toHaveBeenCalledTimes(1);
    });

    it('does not call onCreate or onClose when navigating between steps', () => {
      const onClose = jest.fn();
      const onCreate = jest.fn();
      const { getByTestId } = renderFlyout({ onCreate, onClose });

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
