/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ConfirmBuilderToEsqlModal,
  CONFIRM_BUILDER_TO_ESQL_VARIANT,
} from './confirm_builder_to_esql_modal';

describe('ConfirmBuilderToEsqlModal', () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('user-initiated variant (default)', () => {
    it('renders with the expected title and description', () => {
      render(<ConfirmBuilderToEsqlModal onConfirm={onConfirm} onCancel={onCancel} />);

      expect(screen.getByText('Switch to ES|QL mode?')).toBeInTheDocument();
      expect(screen.getByText(/Switching to ES\|QL mode is permanent/)).toBeInTheDocument();
    });

    it('calls onConfirm when the confirm button is clicked', async () => {
      render(<ConfirmBuilderToEsqlModal onConfirm={onConfirm} onCancel={onCancel} />);

      await userEvent.click(screen.getByText('Open in ES|QL mode'));
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('calls onCancel when the cancel button is clicked', async () => {
      render(<ConfirmBuilderToEsqlModal onConfirm={onConfirm} onCancel={onCancel} />);

      await userEvent.click(screen.getByText('Cancel'));
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('incompatible-query variant', () => {
    it('renders with the unparseable title and description', () => {
      render(
        <ConfirmBuilderToEsqlModal
          variant={CONFIRM_BUILDER_TO_ESQL_VARIANT.INCOMPATIBLE_QUERY}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      expect(screen.getByText('Rule cannot be opened in builder mode')).toBeInTheDocument();
      expect(
        screen.getByText(/modified outside the builder and can no longer be parsed/)
      ).toBeInTheDocument();
    });

    it('calls onConfirm when the confirm button is clicked', async () => {
      render(
        <ConfirmBuilderToEsqlModal
          variant={CONFIRM_BUILDER_TO_ESQL_VARIANT.INCOMPATIBLE_QUERY}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      await userEvent.click(screen.getByText('Open in ES|QL mode'));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('has the correct data-test-subj attribute', () => {
    render(<ConfirmBuilderToEsqlModal onConfirm={onConfirm} onCancel={onCancel} />);

    expect(screen.getByTestId('alertingV2ConfirmBuilderToEsqlModal')).toBeInTheDocument();
  });
});
