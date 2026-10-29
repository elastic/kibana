/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider, useEuiTheme, useResizeObserver } from '@elastic/eui';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { AttachmentHeader, COMPACT_WIDTH_THRESHOLD } from './attachment_header';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useResizeObserver: jest.fn(),
}));

const useResizeObserverMock = useResizeObserver as jest.Mock;

let colors: ReturnType<typeof useEuiTheme>['euiTheme']['colors'];
const ThemeProbe: React.FC = () => {
  colors = useEuiTheme().euiTheme.colors;
  return null;
};

const renderHeader = (props: Partial<React.ComponentProps<typeof AttachmentHeader>> = {}) =>
  render(
    <EuiProvider>
      <ThemeProbe />
      <AttachmentHeader
        title="My attachment"
        icon="document"
        actionButtons={[
          { label: 'Run', icon: 'play', type: ActionButtonType.PRIMARY, handler: jest.fn() },
        ]}
        {...props}
      />
    </EuiProvider>
  );

/** Resolves a color token to the form jsdom reports for the given style property. */
const normalize = (color: string, property: 'color' | 'borderColor' = 'borderColor') => {
  const element = document.createElement('div');
  element.style[property] = color;
  return element.style[property];
};

const getDividerColor = (container: HTMLElement) => {
  const header = container.querySelector('.euiSplitPanel__inner');
  return header ? getComputedStyle(header).borderBottomColor : undefined;
};

describe('AttachmentHeader', () => {
  beforeEach(() => {
    useResizeObserverMock.mockReturnValue({ width: 800, height: 48 });
  });

  it('uses the plain divider inline', () => {
    const { container } = renderHeader();

    expect(getDividerColor(container)).toBe(normalize(colors.borderBasePlain));
  });

  it('uses the subdued divider in the canvas flyout', () => {
    const { container } = renderHeader({ isCanvas: true });

    expect(getDividerColor(container)).toBe(normalize(colors.borderBaseSubdued));
  });

  it('uses the subdued divider and a colored title for a color variant', () => {
    const { container } = renderHeader({ color: 'danger' });

    expect(getDividerColor(container)).toBe(normalize(colors.borderBaseSubdued));
    expect(getComputedStyle(screen.getByText('My attachment')).color).toBe(
      normalize(colors.textDanger, 'color')
    );
  });

  it('omits the divider when the header has no body', () => {
    const { container } = renderHeader({ isHeaderOnly: true });

    expect(container.querySelector('.euiSplitPanel__inner')).toHaveStyle('border-bottom: none');
  });

  it('shows the label on the main button when there is room', () => {
    renderHeader();

    expect(screen.getByText('Run')).toBeInTheDocument();
  });

  it('shows only the icon on the main button at compact widths', () => {
    useResizeObserverMock.mockReturnValue({ width: COMPACT_WIDTH_THRESHOLD, height: 48 });
    renderHeader();

    expect(screen.queryByText('Run')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run' })).toBeInTheDocument();
  });

  it('renders nothing without actions or a close handler', () => {
    const { container } = renderHeader({ actionButtons: [] });

    expect(container.querySelector('.euiSplitPanel__inner')).not.toBeInTheDocument();
  });
});
