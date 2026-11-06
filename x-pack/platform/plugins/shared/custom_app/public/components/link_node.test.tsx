/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appDocumentSchema } from '@kbn/custom-app-common';
import { renderApp } from './test_utils';

const navigateToApp = jest.fn();
const navigateDiscover = jest.fn();
const getRedirectUrl = jest.fn(
  (params: { query: { esql: string } }) => `/r?q=${params.query.esql}`
);
let mockShare: unknown;

jest.mock('../services', () => ({
  getServices: () => ({
    core: {
      application: {
        navigateToApp,
        getUrlForApp: (app: string, { path }: { path?: string } = {}) =>
          `/base/app/${app}${path ?? ''}`,
        capabilities: { navLinks: { dashboards: true, discover: true } },
      },
    },
    share: mockShare,
  }),
}));

const noData = async () => ({ columns: [], rows: [] });

const documentWith = (link: Record<string, unknown>, extra: unknown[] = []) =>
  appDocumentSchema.parse({
    state: {
      id: { type: 'string', default: 'abc' },
      service: { type: 'string', default: 'checkout' },
    },
    root: {
      type: 'stack',
      id: 'root',
      children: [
        { type: 'link', id: 'go', label: 'Open it', ...link },
        { type: 'table', id: 'rows', query: 'FROM logs | WHERE s == ?service | LIMIT 5' },
        ...extra,
      ],
    },
  });

describe('LinkNode', () => {
  beforeEach(() => {
    navigateToApp.mockClear();
    navigateDiscover.mockClear();
    getRedirectUrl.mockClear();
    mockShare = {
      url: {
        locators: { get: () => ({ getRedirectUrl, navigate: navigateDiscover }) },
      },
    };
  });

  it('is a link with what is written on it, to the address of the page', async () => {
    await renderApp(
      documentWith({ to: { type: 'app', app: 'dashboards', path: '#/view/{{state.id}}' } }),
      noData
    );

    expect(screen.getByRole('link', { name: 'Open it' })).toHaveAttribute(
      'href',
      '/base/app/dashboards#/view/abc'
    );
  });

  it('goes there inside Kibana when it is clicked, and not by loading the page again', async () => {
    await renderApp(
      documentWith({ to: { type: 'app', app: 'dashboards', path: '#/view/{{state.id}}' } }),
      noData
    );

    await userEvent.click(screen.getByRole('link', { name: 'Open it' }));

    expect(navigateToApp).toHaveBeenCalledWith('dashboards', { path: '#/view/abc' });
  });

  it.each([
    ['with the command key', { metaKey: true }],
    ['with the control key', { ctrlKey: true }],
    ['with the shift key', { shiftKey: true }],
    ['with the middle button', { button: 1 }],
  ])(
    'is left to the browser, to open in another tab, when it is clicked %s',
    async (_how, init) => {
      await renderApp(documentWith({ to: { type: 'app', app: 'dashboards' } }), noData);
      // The browser would go to the address, which a test page cannot.
      const stopNavigation = (event: Event) => event.preventDefault();
      document.addEventListener('click', stopNavigation);

      fireEvent.click(screen.getByRole('link', { name: 'Open it' }), init);
      document.removeEventListener('click', stopNavigation);

      expect(navigateToApp).not.toHaveBeenCalled();
    }
  );

  it('follows the values of the app, in its label and its address', async () => {
    const { runtime } = await renderApp(
      documentWith({
        label: 'Open {{state.id}}',
        to: { type: 'app', app: 'dashboards', path: '#/view/{{state.id}}' },
      }),
      noData
    );

    act(() => {
      runtime.run([{ type: 'setState', key: 'id', value: 'next' }]);
    });

    expect(screen.getByRole('link', { name: 'Open next' })).toHaveAttribute(
      'href',
      '/base/app/dashboards#/view/next'
    );
  });

  it('opens a component query in Discover with the values it has now', async () => {
    const { runtime } = await renderApp(
      documentWith({ to: { type: 'discover', from: 'rows' } }),
      noData
    );
    expect(screen.getByRole('link', { name: 'Open it' })).toHaveAttribute(
      'href',
      '/r?q=FROM logs | WHERE s == "checkout" | LIMIT 5'
    );

    act(() => {
      runtime.run([{ type: 'setState', key: 'service', value: 'cart' }]);
    });
    await userEvent.click(screen.getByRole('link', { name: 'Open it' }));

    await waitFor(() =>
      expect(navigateDiscover).toHaveBeenCalledWith(
        expect.objectContaining({ query: { esql: 'FROM logs | WHERE s == "cart" | LIMIT 5' } })
      )
    );
  });

  it('is shown as text that says why when Discover is not there', async () => {
    mockShare = undefined;
    await renderApp(documentWith({ to: { type: 'discover', from: 'rows' } }), noData);

    expect(screen.queryByRole('link', { name: 'Open it' })).not.toBeInTheDocument();
    const text = screen.getByTestId('customAppLinkUnavailable');
    expect(text).toHaveTextContent('Open it');
    await userEvent.hover(text);
    expect(await screen.findByText('Discover is not available.')).toBeInTheDocument();
  });

  it('is shown as text when the page is not one the person can open', async () => {
    await renderApp(documentWith({ to: { type: 'app', app: 'secret' } }), noData);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByTestId('customAppLinkUnavailable')).toBeInTheDocument();
  });
});
