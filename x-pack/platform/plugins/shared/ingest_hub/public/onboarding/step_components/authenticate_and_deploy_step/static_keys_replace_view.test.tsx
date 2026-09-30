/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { StaticKeysReplaceView } from './static_keys_replace_view';

function renderView({
  onReadyChange = jest.fn(),
  onFieldsChange = jest.fn(),
}: {
  onReadyChange?: jest.Mock;
  onFieldsChange?: jest.Mock;
} = {}) {
  return render(
    <I18nProvider>
      <StaticKeysReplaceView onReadyChange={onReadyChange} onFieldsChange={onFieldsChange} />
    </I18nProvider>
  );
}

describe('StaticKeysReplaceView', () => {
  describe('initial state', () => {
    it('renders hidden panel for access key ID (no input visible)', () => {
      renderView();
      expect(screen.queryByTestId('staticKeysReplace-accessKeyId')).not.toBeInTheDocument();
    });

    it('renders hidden panel for secret access key (no input visible)', () => {
      renderView();
      expect(screen.queryByTestId('staticKeysReplace-secretAccessKey')).not.toBeInTheDocument();
    });

    it('calls onReadyChange(false) on mount', () => {
      const onReadyChange = jest.fn();
      renderView({ onReadyChange });
      expect(onReadyChange).toHaveBeenCalledWith(false);
    });
  });

  describe('replacing access key ID', () => {
    it('shows text input after clicking Replace Access key ID', () => {
      renderView();
      fireEvent.click(screen.getByText(/replace access key id/i));
      expect(screen.getByTestId('staticKeysReplace-accessKeyId')).toBeInTheDocument();
    });

    it('hides input and clears value after clicking Cancel', () => {
      const onReadyChange = jest.fn();
      renderView({ onReadyChange });
      fireEvent.click(screen.getByText(/replace access key id/i));
      fireEvent.change(screen.getByTestId('staticKeysReplace-accessKeyId'), {
        target: { value: 'AKIA123' },
      });
      fireEvent.click(screen.getByText(/cancel access key id change/i));
      expect(screen.queryByTestId('staticKeysReplace-accessKeyId')).not.toBeInTheDocument();
    });
  });

  describe('replacing secret access key', () => {
    it('shows password input after clicking Replace Secret access key', () => {
      renderView();
      fireEvent.click(screen.getByText(/replace secret access key/i));
      expect(screen.getByTestId('staticKeysReplace-secretAccessKey')).toBeInTheDocument();
    });

    it('hides input after clicking Cancel', () => {
      renderView();
      fireEvent.click(screen.getByText(/replace secret access key/i));
      fireEvent.click(screen.getByText(/cancel secret access key change/i));
      expect(screen.queryByTestId('staticKeysReplace-secretAccessKey')).not.toBeInTheDocument();
    });
  });

  describe('readiness and field propagation', () => {
    it('does not call onReadyChange(true) when only access key ID replaced', () => {
      const onReadyChange = jest.fn();
      renderView({ onReadyChange });
      fireEvent.click(screen.getByText(/replace access key id/i));
      fireEvent.change(screen.getByTestId('staticKeysReplace-accessKeyId'), {
        target: { value: 'AKIA123' },
      });
      expect(onReadyChange).not.toHaveBeenCalledWith(true);
    });

    it('does not call onReadyChange(true) when only secret replaced', () => {
      const onReadyChange = jest.fn();
      renderView({ onReadyChange });
      fireEvent.click(screen.getByText(/replace secret access key/i));
      fireEvent.change(screen.getByTestId('staticKeysReplace-secretAccessKey'), {
        target: { value: 'mysecret' },
      });
      expect(onReadyChange).not.toHaveBeenCalledWith(true);
    });

    it('calls onReadyChange(true) when both fields replaced and filled', () => {
      const onReadyChange = jest.fn();
      renderView({ onReadyChange });
      fireEvent.click(screen.getByText(/replace access key id/i));
      fireEvent.change(screen.getByTestId('staticKeysReplace-accessKeyId'), {
        target: { value: 'AKIA123' },
      });
      fireEvent.click(screen.getByText(/replace secret access key/i));
      fireEvent.change(screen.getByTestId('staticKeysReplace-secretAccessKey'), {
        target: { value: 'mysecret' },
      });
      expect(onReadyChange).toHaveBeenCalledWith(true);
    });

    it('calls onFieldsChange with both values when ready', () => {
      const onFieldsChange = jest.fn();
      renderView({ onFieldsChange });
      fireEvent.click(screen.getByText(/replace access key id/i));
      fireEvent.change(screen.getByTestId('staticKeysReplace-accessKeyId'), {
        target: { value: 'AKIA123' },
      });
      fireEvent.click(screen.getByText(/replace secret access key/i));
      fireEvent.change(screen.getByTestId('staticKeysReplace-secretAccessKey'), {
        target: { value: 'mysecret' },
      });
      expect(onFieldsChange).toHaveBeenCalledWith({
        access_key_id: 'AKIA123',
        secret_access_key: 'mysecret',
      });
    });

    it('calls onReadyChange(false) when access key cancelled after both filled', () => {
      const onReadyChange = jest.fn();
      renderView({ onReadyChange });
      fireEvent.click(screen.getByText(/replace access key id/i));
      fireEvent.change(screen.getByTestId('staticKeysReplace-accessKeyId'), {
        target: { value: 'AKIA123' },
      });
      fireEvent.click(screen.getByText(/replace secret access key/i));
      fireEvent.change(screen.getByTestId('staticKeysReplace-secretAccessKey'), {
        target: { value: 'mysecret' },
      });
      fireEvent.click(screen.getByText(/cancel access key id change/i));
      expect(onReadyChange).toHaveBeenLastCalledWith(false);
    });
  });
});
