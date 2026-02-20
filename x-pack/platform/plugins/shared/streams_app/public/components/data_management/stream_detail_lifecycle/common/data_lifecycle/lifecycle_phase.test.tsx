/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LifecyclePhase } from './lifecycle_phase';

describe('LifecyclePhase', () => {
  describe('Basic rendering', () => {
    it('should render phase with label', () => {
      render(<LifecyclePhase label="hot" color="#FF0000" canManageLifecycle />);

      expect(screen.getByTestId('lifecyclePhase-hot-name')).toBeInTheDocument();
    });

    it('should render phase with size', () => {
      render(<LifecyclePhase label="hot" color="#FF0000" size="1.0 GB" canManageLifecycle />);

      expect(screen.getByTestId('lifecyclePhase-hot-size')).toHaveTextContent('1.0 GB');
    });

    it('should capitalize label', () => {
      render(<LifecyclePhase label="warm" color="#FFA500" canManageLifecycle />);

      expect(screen.getByTestId('lifecyclePhase-warm-name')).toHaveTextContent('Warm');
    });
  });

  describe('Delete phase', () => {
    it('should render trash icon for delete phase', () => {
      render(<LifecyclePhase isDelete label="delete" canManageLifecycle />);

      expect(screen.getByTestId('dataLifecycle-delete-icon')).toBeInTheDocument();
    });

    it('should not render label for delete phase', () => {
      render(<LifecyclePhase isDelete label="delete" canManageLifecycle />);

      expect(screen.queryByTestId('lifecyclePhase-delete-name')).not.toBeInTheDocument();
      expect(screen.getByTestId('dataLifecycle-delete-icon')).toBeInTheDocument();
    });
  });

  describe('Popover interaction', () => {
    it('should open popover on click', () => {
      render(
        <LifecyclePhase
          label="hot"
          color="#FF0000"
          description="Hot phase description"
          canManageLifecycle
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByTestId('lifecyclePhase-hot-popoverTitle')).toBeInTheDocument();
      expect(screen.getByTestId('lifecyclePhase-hot-description')).toHaveTextContent(
        'Hot phase description'
      );
    });

    it('should call onClick when clicked', () => {
      const onClick = jest.fn();
      render(<LifecyclePhase label="hot" color="#FF0000" onClick={onClick} canManageLifecycle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(onClick).toHaveBeenCalled();
    });

    it('should close popover when clicking outside', () => {
      render(<LifecyclePhase label="hot" color="#FF0000" description="Test" canManageLifecycle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByTestId('lifecyclePhase-hot-popoverTitle')).toBeInTheDocument();

      // Click the button again to close (toggle)
      fireEvent.click(button);
    });
  });

  describe('Popover content', () => {
    it('should display stored size in popover', () => {
      render(
        <LifecyclePhase label="hot" color="#FF0000" sizeInBytes={1073741824} canManageLifecycle />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByTestId('lifecyclePhase-hot-storedSize')).toBeInTheDocument();
      expect(screen.getByTestId('lifecyclePhase-hot-storedSizeValue')).toHaveTextContent('1.0 GB');
    });

    it('should display document count in popover', () => {
      render(<LifecyclePhase label="hot" color="#FF0000" docsCount={1000000} canManageLifecycle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByTestId('lifecyclePhase-hot-docsCount')).toBeInTheDocument();
      expect(screen.getByTestId('lifecyclePhase-hot-docsCountValue')).toHaveTextContent(
        '1,000,000'
      );
    });

    it('should display retention period in popover', () => {
      render(<LifecyclePhase label="warm" color="#FFA500" minAge="30d" canManageLifecycle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByTestId('lifecyclePhase-warm-minAge')).toBeInTheDocument();
      expect(screen.getByTestId('lifecyclePhase-warm-minAgeValue')).toHaveTextContent('30d');
    });

    it('should not display retention period for hot phase', () => {
      render(<LifecyclePhase label="hot" color="#FF0000" minAge="0d" canManageLifecycle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.queryByTestId('lifecyclePhase-hot-minAge')).not.toBeInTheDocument();
    });

    it('should not display retention period for zero age', () => {
      render(<LifecyclePhase label="warm" color="#FFA500" minAge="0d" canManageLifecycle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.queryByTestId('lifecyclePhase-warm-minAge')).not.toBeInTheDocument();
    });

    it('should display read-only indicator', () => {
      render(<LifecyclePhase label="cold" color="#0000FF" isReadOnly canManageLifecycle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByTestId('lifecyclePhase-cold-readOnly')).toBeInTheDocument();
    });

    it('should display searchable snapshot for cold phase', () => {
      render(
        <LifecyclePhase
          label="cold"
          color="#0000FF"
          searchableSnapshot="my-snapshot-repo"
          canManageLifecycle
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByTestId('lifecyclePhase-cold-searchableSnapshot')).toBeInTheDocument();
      expect(screen.getByTestId('lifecyclePhase-cold-snapshotRepository')).toHaveTextContent(
        'my-snapshot-repo'
      );
    });

    it('should display searchable snapshot for frozen phase', () => {
      render(
        <LifecyclePhase
          label="frozen"
          color="#00FFFF"
          searchableSnapshot="aws-s3-repo"
          canManageLifecycle
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByTestId('lifecyclePhase-frozen-searchableSnapshot')).toBeInTheDocument();
      expect(screen.getByTestId('lifecyclePhase-frozen-snapshotRepository')).toHaveTextContent(
        'aws-s3-repo'
      );
    });

    it('should not display searchable snapshot for non-cold/frozen phases', () => {
      render(
        <LifecyclePhase
          label="hot"
          color="#FF0000"
          searchableSnapshot="my-repo"
          canManageLifecycle
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.queryByTestId('lifecyclePhase-hot-searchableSnapshot')).not.toBeInTheDocument();
    });
  });

  describe('Remove actions', () => {
    it('should show remove button for ILM non-hot phase', () => {
      render(
        <LifecyclePhase
          label="warm"
          color="#FFA500"
          isIlm
          onRemovePhase={jest.fn()}
          description="Warm phase description"
          canManageLifecycle
        />
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByTestId('lifecyclePhase-warm-removeButton')).toBeInTheDocument();
    });

    it('should not show remove button when user lacks permission', () => {
      render(
        <LifecyclePhase
          label="warm"
          color="#FFA500"
          isIlm
          onRemovePhase={jest.fn()}
          description="Warm phase description"
          canManageLifecycle={false}
        />
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.queryByTestId('lifecyclePhase-warm-removeButton')).not.toBeInTheDocument();
    });

    it('should call onRemovePhase when remove button is clicked', () => {
      const onRemovePhase = jest.fn();
      render(
        <LifecyclePhase
          label="warm"
          color="#FFA500"
          isIlm
          onRemovePhase={onRemovePhase}
          description="Warm phase description"
          canManageLifecycle
        />
      );

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByTestId('lifecyclePhase-warm-removeButton'));

      expect(onRemovePhase).toHaveBeenCalledWith('warm');
    });

    it('should not show remove button for hot phase', () => {
      render(
        <LifecyclePhase
          label="hot"
          color="#FF0000"
          isIlm
          onRemovePhase={jest.fn()}
          description="Hot phase description"
          canManageLifecycle
        />
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.queryByTestId('lifecyclePhase-hot-removeButton')).not.toBeInTheDocument();
    });

    it('should show disabled remove button when isRemoveDisabled is true', () => {
      render(
        <LifecyclePhase
          label="warm"
          color="#FFA500"
          isIlm
          onRemovePhase={jest.fn()}
          description="Warm phase description"
          canManageLifecycle
          isRemoveDisabled
          removeDisabledReason="This is the only remaining phase"
        />
      );

      fireEvent.click(screen.getByRole('button'));

      const removeButton = screen.getByTestId('lifecyclePhase-warm-removeButton');
      expect(removeButton).toBeInTheDocument();
      expect(removeButton).toBeDisabled();
    });

    it('should not call onRemovePhase when disabled remove button is clicked', () => {
      const onRemovePhase = jest.fn();
      render(
        <LifecyclePhase
          label="warm"
          color="#FFA500"
          isIlm
          onRemovePhase={onRemovePhase}
          description="Warm phase description"
          canManageLifecycle
          isRemoveDisabled
          removeDisabledReason="This is the only remaining phase"
        />
      );

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByTestId('lifecyclePhase-warm-removeButton'));

      expect(onRemovePhase).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have correct aria-label for phase', () => {
      render(<LifecyclePhase label="hot" color="#FF0000" canManageLifecycle />);

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'hot phase');
    });

    it('should have correct aria-label for delete phase', () => {
      render(<LifecyclePhase isDelete label="delete" canManageLifecycle />);

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Delete phase');
    });
  });
});
