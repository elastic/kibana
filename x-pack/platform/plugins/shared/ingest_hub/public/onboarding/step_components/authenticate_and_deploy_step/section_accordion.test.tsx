/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

// ─── Component under test ────────────────────────────────────────────────────

import { DeploymentSectionAccordion } from './section_accordion';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderAccordion(
  props: {
    icon?: string;
    title?: string;
    serviceCount?: number;
    isDone?: boolean;
    autoCollapse?: boolean;
    dataTestSubj?: string;
    headerButtonTestSubj?: string;
    children?: React.ReactNode;
  } = {}
) {
  const {
    icon = 'gear',
    title = 'Test Section',
    serviceCount = 3,
    isDone = false,
    dataTestSubj = 'testSection',
    headerButtonTestSubj = 'testSection-headerButton',
    children = <div data-test-subj="section-content">Section content</div>,
  } = props;

  // autoCollapse may be undefined (to test default), so we must pass it conditionally
  const accordionProps =
    props.autoCollapse !== undefined
      ? {
          icon,
          title,
          serviceCount,
          isDone,
          autoCollapse: props.autoCollapse,
          dataTestSubj,
          headerButtonTestSubj,
          children,
        }
      : { icon, title, serviceCount, isDone, dataTestSubj, headerButtonTestSubj, children };

  return render(
    <I18nProvider>
      <DeploymentSectionAccordion {...accordionProps} />
    </I18nProvider>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DeploymentSectionAccordion', () => {
  it('renders content open by default', () => {
    renderAccordion();
    expect(screen.getByTestId('section-content')).toBeInTheDocument();
  });

  it('header button toggles content', () => {
    renderAccordion();
    expect(screen.getByTestId('section-content')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('testSection-headerButton'));
    expect(screen.queryByTestId('section-content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('testSection-headerButton'));
    expect(screen.getByTestId('section-content')).toBeInTheDocument();
  });

  it('shows Done badge when isDone=true', () => {
    renderAccordion({ isDone: true });
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('hides Done badge when isDone=false', () => {
    renderAccordion({ isDone: false });
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });

  it('collapses when isDone transitions false→true (autoCollapse default)', () => {
    const { rerender } = renderAccordion({ isDone: false });
    expect(screen.getByTestId('section-content')).toBeInTheDocument();

    act(() => {
      rerender(
        <I18nProvider>
          <DeploymentSectionAccordion
            icon="gear"
            title="Test Section"
            serviceCount={3}
            isDone={true}
            dataTestSubj="testSection"
            headerButtonTestSubj="testSection-headerButton"
          >
            <div data-test-subj="section-content">Section content</div>
          </DeploymentSectionAccordion>
        </I18nProvider>
      );
    });

    expect(screen.queryByTestId('section-content')).not.toBeInTheDocument();
  });

  it('stays open when isDone transitions false→true and autoCollapse={false}', () => {
    const { rerender } = renderAccordion({ isDone: false, autoCollapse: false });
    expect(screen.getByTestId('section-content')).toBeInTheDocument();

    act(() => {
      rerender(
        <I18nProvider>
          <DeploymentSectionAccordion
            icon="gear"
            title="Test Section"
            serviceCount={3}
            isDone={true}
            autoCollapse={false}
            dataTestSubj="testSection"
            headerButtonTestSubj="testSection-headerButton"
          >
            <div data-test-subj="section-content">Section content</div>
          </DeploymentSectionAccordion>
        </I18nProvider>
      );
    });

    expect(screen.getByTestId('section-content')).toBeInTheDocument();
  });

  it('does not collapse when mounted with isDone=true already', () => {
    // Mounting with isDone=true should keep the section open; auto-collapse only fires on
    // the false→true transition, not on initial mount.
    renderAccordion({ isDone: true });
    expect(screen.getByTestId('section-content')).toBeInTheDocument();
  });

  it('shows service count in header', () => {
    renderAccordion({ serviceCount: 5 });
    expect(screen.getByText('5 services')).toBeInTheDocument();
  });
});
