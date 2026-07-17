/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarAccordionSection } from './sidebar_accordion_section';

describe('SidebarAccordionSection', () => {
  it('renders the title and children when open', () => {
    const onToggle = jest.fn();

    render(
      <SidebarAccordionSection
        id="attributes"
        title="Attributes"
        isOpen={true}
        onToggle={onToggle}
        data-test-subj="case-view-sidebar-attributes"
      >
        <div data-test-subj="accordion-child">{'Child content'}</div>
      </SidebarAccordionSection>
    );

    expect(screen.getByText('Attributes')).toBeInTheDocument();
    expect(screen.getByTestId('accordion-child')).toBeInTheDocument();
  });

  it('keeps children mounted but inert when closed, so pending edits are not lost', () => {
    const onToggle = jest.fn();

    render(
      <SidebarAccordionSection
        id="attributes"
        title="Attributes"
        isOpen={false}
        onToggle={onToggle}
        data-test-subj="case-view-sidebar-attributes"
      >
        <div data-test-subj="accordion-child">{'Child content'}</div>
      </SidebarAccordionSection>
    );

    expect(screen.getByText('Attributes')).toBeInTheDocument();
    expect(screen.getByTestId('accordion-child')).toBeInTheDocument();
    expect(screen.getByTestId('case-view-sidebar-attributes')).not.toHaveClass(
      'euiAccordion-isOpen'
    );
  });

  it('renders extraAction when provided', () => {
    const onToggle = jest.fn();

    render(
      <SidebarAccordionSection
        id="templateFields"
        title="Template fields"
        extraAction={
          <button type="button" data-test-subj="extra-action">
            {'Settings'}
          </button>
        }
        isOpen={true}
        onToggle={onToggle}
        data-test-subj="case-view-sidebar-template-fields"
      >
        <div>{'Child content'}</div>
      </SidebarAccordionSection>
    );

    expect(screen.getByTestId('extra-action')).toBeInTheDocument();
  });

  it('falls back to a default data-test-subj when none is provided', () => {
    const onToggle = jest.fn();

    render(
      <SidebarAccordionSection id="attributes" title="Attributes" isOpen={true} onToggle={onToggle}>
        <div>{'Child content'}</div>
      </SidebarAccordionSection>
    );

    expect(screen.getByTestId('sidebar-accordion-section')).toBeInTheDocument();
  });

  it('calls onToggle with the section id when toggled', async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();

    render(
      <SidebarAccordionSection
        id="connectors"
        title="Connectors"
        isOpen={true}
        onToggle={onToggle}
        data-test-subj="case-view-sidebar-connectors"
      >
        <div>{'Child content'}</div>
      </SidebarAccordionSection>
    );

    await user.click(screen.getByTestId('case-view-sidebar-connectors-toggle'));

    expect(onToggle).toHaveBeenCalledWith('connectors', false);
  });
});
