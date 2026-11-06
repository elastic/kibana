/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import type { CoreStart } from '@kbn/core/public';

import { AttachmentAccordion } from './attachment_accordion';
import { mockedTestProvidersOwner, renderWithTestingProviders } from '../../../common/mock';
import { CASE_VIEW_ATTACHMENT_ACCORDION_OPENED_EVENT_TYPE } from '../../../../common/constants';

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

  it('reports a case_view_attachment_accordion_opened EBT event on initial mount, since accordions default to open', () => {
    const coreStart = coreMock.createStart() as unknown as CoreStart;

    renderWithTestingProviders(
      <AttachmentAccordion id="alerts" title="Alerts" count={5}>
        <div />
      </AttachmentAccordion>,
      { wrapperProps: { coreStart } }
    );

    expect(coreStart.analytics.reportEvent).toHaveBeenCalledWith(
      CASE_VIEW_ATTACHMENT_ACCORDION_OPENED_EVENT_TYPE,
      { owner: mockedTestProvidersOwner[0], attachment_type: 'alerts' }
    );
    expect(coreStart.analytics.reportEvent).toHaveBeenCalledTimes(1);
  });

  it('reports another case_view_attachment_accordion_opened EBT event each time the accordion is re-opened', () => {
    const coreStart = coreMock.createStart() as unknown as CoreStart;

    renderWithTestingProviders(
      <AttachmentAccordion id="alerts" title="Alerts" count={5}>
        <div />
      </AttachmentAccordion>,
      { wrapperProps: { coreStart } }
    );

    const toggleButton = screen.getByTestId('case-view-attachment-accordion-toggle-alerts');

    expect(coreStart.analytics.reportEvent).toHaveBeenCalledTimes(1);

    // Collapsing must not report another "opened" event.
    fireEvent.click(toggleButton);
    expect(coreStart.analytics.reportEvent).toHaveBeenCalledTimes(1);

    // Re-opening reports a second "opened" event.
    fireEvent.click(toggleButton);
    expect(coreStart.analytics.reportEvent).toHaveBeenCalledTimes(2);
    expect(coreStart.analytics.reportEvent).toHaveBeenNthCalledWith(
      2,
      CASE_VIEW_ATTACHMENT_ACCORDION_OPENED_EVENT_TYPE,
      { owner: mockedTestProvidersOwner[0], attachment_type: 'alerts' }
    );
  });
});
