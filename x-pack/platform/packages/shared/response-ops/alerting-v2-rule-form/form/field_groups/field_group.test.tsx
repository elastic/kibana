/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { useRuleFormMeta } from '../contexts';
import { FieldGroup } from './field_group';

jest.mock('../contexts', () => ({
  useRuleFormMeta: jest.fn(),
}));

const mockUseRuleFormMeta = useRuleFormMeta as jest.MockedFunction<typeof useRuleFormMeta>;

const renderFieldGroup = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en">{ui}</IntlProvider>);

describe('FieldGroup', () => {
  beforeEach(() => {
    mockUseRuleFormMeta.mockReturnValue({ layout: 'page' });
  });

  it('renders the title', () => {
    renderFieldGroup(
      <FieldGroup title="Test Section">
        <div>Child content</div>
      </FieldGroup>
    );

    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });

  it('renders the title as an h3 heading', () => {
    renderFieldGroup(
      <FieldGroup title="Test Section">
        <div>Child content</div>
      </FieldGroup>
    );

    const heading = screen.getByRole('heading', { name: 'Test Section' });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H3');
  });

  it('renders children content', () => {
    renderFieldGroup(
      <FieldGroup title="Test Section">
        <div data-test-subj="child-content">Child content</div>
      </FieldGroup>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    renderFieldGroup(
      <FieldGroup title="Test Section">
        <div data-test-subj="child-1">First child</div>
        <div data-test-subj="child-2">Second child</div>
      </FieldGroup>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });

  it('renders title with strong styling', () => {
    renderFieldGroup(
      <FieldGroup title="Test Section">
        <div>Child content</div>
      </FieldGroup>
    );

    const strong = screen.getByText('Test Section').closest('strong');
    expect(strong).toBeInTheDocument();
  });

  it('supports a controlled collapsible state', async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();

    renderFieldGroup(
      <FieldGroup title="Test Section" isOpen={false} onToggle={onToggle}>
        <div>Child content</div>
      </FieldGroup>
    );

    await user.click(screen.getByRole('button', { name: 'Toggle Test Section' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Test Section' })).toBeInTheDocument();
    expect(screen.queryByText('Child content')).not.toBeInTheDocument();
  });

  it('supports uncontrolled collapsible state with defaultOpen', async () => {
    const user = userEvent.setup();

    renderFieldGroup(
      <FieldGroup title="Test Section" defaultOpen={false}>
        <div>Toggleable child content</div>
      </FieldGroup>
    );

    expect(screen.getByRole('heading', { name: 'Test Section' })).toBeInTheDocument();
    expect(screen.queryByText('Toggleable child content')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Toggle Test Section' }));
    expect(screen.getByText('Toggleable child content')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Toggle Test Section' }));
    expect(screen.queryByText('Toggleable child content')).not.toBeInTheDocument();
  });

  describe('flyout layout', () => {
    beforeEach(() => {
      mockUseRuleFormMeta.mockReturnValue({ layout: 'flyout' });
    });

    it('renders an accordion with the title as button content', () => {
      renderFieldGroup(
        <FieldGroup title="Test Section">
          <div>Child content</div>
        </FieldGroup>
      );

      expect(screen.getByRole('button', { name: 'Test Section' })).toBeInTheDocument();
    });

    it('renders children when initially open (static variant)', () => {
      renderFieldGroup(
        <FieldGroup title="Test Section">
          <div>Child content</div>
        </FieldGroup>
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('hides children when defaultOpen is false (uncontrolled variant)', () => {
      renderFieldGroup(
        <FieldGroup title="Test Section" defaultOpen={false}>
          <div>Child content</div>
        </FieldGroup>
      );

      // EuiAccordion keeps content in the DOM but hides it when closed
      expect(screen.getByText('Child content')).not.toBeVisible();
    });

    it('opens on toggle when defaultOpen is false (uncontrolled variant)', async () => {
      const user = userEvent.setup();

      renderFieldGroup(
        <FieldGroup title="Test Section" defaultOpen={false}>
          <div>Child content</div>
        </FieldGroup>
      );

      await user.click(screen.getByRole('button', { name: 'Test Section' }));
      expect(screen.getByText('Child content')).toBeVisible();
    });

    it('calls onToggle when accordion is toggled (controlled variant)', async () => {
      const user = userEvent.setup();
      const onToggle = jest.fn();

      renderFieldGroup(
        <FieldGroup title="Test Section" isOpen={true} onToggle={onToggle}>
          <div>Child content</div>
        </FieldGroup>
      );

      await user.click(screen.getByRole('button', { name: 'Test Section' }));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('shows/hides content based on isOpen (controlled variant)', () => {
      const { rerender } = renderFieldGroup(
        <FieldGroup title="Test Section" isOpen={true} onToggle={jest.fn()}>
          <div>Child content</div>
        </FieldGroup>
      );

      expect(screen.getByText('Child content')).toBeVisible();

      rerender(
        <IntlProvider locale="en">
          <FieldGroup title="Test Section" isOpen={false} onToggle={jest.fn()}>
            <div>Child content</div>
          </FieldGroup>
        </IntlProvider>
      );

      expect(screen.getByText('Child content')).not.toBeVisible();
    });
  });
});
