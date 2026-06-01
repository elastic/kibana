/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { AttachmentAccordion } from './attachment_accordion';
import { renderWithTestingProviders } from '../../../common/mock';

describe('AttachmentAccordion', () => {
  it('renders the title, count badge, and children', () => {
    renderWithTestingProviders(
      <AttachmentAccordion id="alerts" title="Alerts" count={5}>
        <div data-test-subj="accordion-content">{'content'}</div>
      </AttachmentAccordion>
    );

    expect(screen.getByTestId('case-view-attachment-accordion-alerts')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByTestId('case-view-attachment-badge-alerts')).toHaveTextContent('5');
    expect(screen.getByTestId('accordion-content')).toBeInTheDocument();
  });

  it('namespaces the test subjects and accordion id by the given id', () => {
    renderWithTestingProviders(
      <AttachmentAccordion id="files" title="Files" count={0}>
        <div />
      </AttachmentAccordion>
    );

    expect(screen.getByTestId('case-view-attachment-accordion-files')).toBeInTheDocument();
    expect(screen.getByTestId('case-view-attachment-badge-files')).toHaveTextContent('0');
  });

  it('renders children initially expanded', () => {
    renderWithTestingProviders(
      <AttachmentAccordion id="observables" title="Observables" count={1}>
        <div data-test-subj="initially-visible-content">{'visible'}</div>
      </AttachmentAccordion>
    );

    expect(screen.getByTestId('case-view-attachment-accordion-toggle-observables')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });
});
