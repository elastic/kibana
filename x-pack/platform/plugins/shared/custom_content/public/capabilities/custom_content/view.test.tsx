/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import type { CapabilityViewProps as CustomAppCapabilityViewProps } from '@kbn/custom-app-registry';
import type { CustomContentNode } from '../../../common/capabilities/custom_content/manifest';
import { CustomContentView } from './view';

const TEMPLATE =
  '<p>{% for row in rows %}<b>{{ row["service"].value }}</b>{% endfor %}</p>{% if rows.size == 0 %}<i>none</i>{% endif %}';

type Props = CustomAppCapabilityViewProps<CustomContentNode>;

const SUCCESS: Props['source'] = {
  status: 'success',
  data: { columns: [{ name: 'service', type: 'keyword' }], rows: [['checkout'], ['cart']] },
};

const setup = (node: Partial<CustomContentNode> = {}, props: Partial<Props> = {}) => {
  const retry = jest.fn();
  render(
    <EuiProvider>
      <CustomContentView
        node={{
          type: 'custom_content',
          id: 'board',
          query: 'FROM status',
          template: TEMPLATE,
          ...node,
        }}
        text={(value) => value}
        context={undefined}
        state={{}}
        runQuery={jest.fn()}
        setValue={jest.fn()}
        source={SUCCESS}
        sources={{}}
        esqlVariables={undefined}
        accentColor={undefined}
        runActions={jest.fn()}
        retry={retry}
        {...props}
      />
    </EuiProvider>
  );
  return { retry };
};

const frame = async () =>
  (await screen.findByTestId('customAppCustomContentFrame')) as HTMLIFrameElement;

describe('the custom content view', () => {
  it('fills the template with the rows of its query', async () => {
    setup();

    const { srcdoc } = await frame();
    expect(srcdoc).toContain('<b>checkout</b>');
    expect(srcdoc).toContain('<b>cart</b>');
  });

  it('shows it in a frame that can do nothing: no scripts, no same-origin, no forms', async () => {
    setup();

    expect((await frame()).getAttribute('sandbox')).toBe('');
  });

  it('cleans the markup before it is shown, whoever wrote it', async () => {
    setup({ template: '<p onclick="alert(1)">hi</p><img src="x" onerror="alert(2)">' });

    const { srcdoc } = await frame();
    expect(srcdoc).toContain('hi');
    expect(srcdoc).not.toContain('onclick');
    expect(srcdoc).not.toContain('onerror');
  });

  const measure = async (scrollHeight: number) => {
    const measuring = (await screen.findByTestId(
      'customAppCustomContentMeasure'
    )) as HTMLIFrameElement;
    // jsdom does not lay a document out, so it is given the height a browser would find.
    Object.defineProperty(measuring, 'contentDocument', {
      configurable: true,
      get: () => ({ documentElement: { scrollHeight } }),
    });
    await act(async () => {
      measuring.dispatchEvent(new Event('load'));
    });
  };

  it('is as tall as it measures, whatever the model said it would be', async () => {
    setup({ height: 900 });
    expect(await frame()).toHaveStyle({ height: '900px' });

    await measure(212.4);

    expect(await frame()).toHaveStyle({ height: '213px' });
  });

  it('is as tall as it declared until it is measured, or a default when it declared nothing', async () => {
    setup({ height: 480 });
    expect(await frame()).toHaveStyle({ height: '480px' });
  });

  it('is a default height when it declared nothing', async () => {
    setup();
    expect(await frame()).toHaveStyle({ height: '320px' });
  });

  it('does not trust a measurement of a document that collapsed', async () => {
    setup({ height: 480 });

    await measure(1);

    expect(await frame()).toHaveStyle({ height: '480px' });
  });

  it('measures in a frame that can read nothing but its height: no scripts, and it is hidden', async () => {
    setup();

    const measuring = await screen.findByTestId('customAppCustomContentMeasure');
    expect(measuring.getAttribute('sandbox')).toBe('allow-same-origin');
    expect(measuring.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('shows a template with no query as it is, and needs no data', async () => {
    setup({ query: undefined, template: '<p>static</p>' }, { source: undefined });

    expect((await frame()).srcdoc).toContain('<p>static</p>');
  });

  it('leaves what to say about no rows to the template, which can handle it', async () => {
    setup(
      {},
      {
        source: {
          status: 'success',
          data: { columns: [{ name: 'service', type: 'keyword' }], rows: [] },
        },
      }
    );

    expect((await frame()).srcdoc).toContain('<i>none</i>');
    expect(screen.queryByText('No results found')).not.toBeInTheDocument();
  });

  it('says why when the query failed, and can try again, instead of showing an empty frame', async () => {
    const { retry } = setup({}, { source: { status: 'error', message: 'Unknown column [nope]' } });

    expect(screen.getByText(/Unknown column \[nope\]/)).toBeInTheDocument();
    expect(screen.queryByTestId('customAppCustomContentFrame')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalled();
  });
});
