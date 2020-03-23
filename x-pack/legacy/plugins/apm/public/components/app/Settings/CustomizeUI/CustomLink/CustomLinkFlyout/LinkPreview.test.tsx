/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { LinkPreview } from '../CustomLinkFlyout/LinkPreview';
import { render, getNodeText, getByTestId } from '@testing-library/react';

describe('LinkPreview', () => {
  const getElementValue = (container: HTMLElement, id: string) =>
    getNodeText(
      ((getByTestId(container, id) as HTMLDivElement)
        .children as HTMLCollection)[0] as HTMLDivElement
    );

  it('shows label and url default values', () => {
    const { container } = render(
      <LinkPreview label="" url="" filters={[['', '']]} />
    );
    expect(getElementValue(container, 'preview-label')).toEqual('Elastic.co');
    expect(getElementValue(container, 'preview-url')).toEqual(
      'https://www.elastic.co'
    );
  });

  it('shows label and url values', () => {
    const { container } = render(
      <LinkPreview label="foo" url="https://baz.co" filters={[['', '']]} />
    );
    expect(getElementValue(container, 'preview-label')).toEqual('foo');
    expect(
      (getByTestId(container, 'preview-link') as HTMLAnchorElement).text
    ).toEqual('https://baz.co');
  });

  it('shows warning when couldnt replace context variables', () => {
    const { container } = render(
      <LinkPreview
        label="foo"
        url="https://baz.co?service.name={{invalid}"
        filters={[['', '']]}
      />
    );
    expect(getElementValue(container, 'preview-label')).toEqual('foo');
    expect(
      (getByTestId(container, 'preview-link') as HTMLAnchorElement).text
    ).toEqual('https://baz.co?service.name={{invalid}');
    expect(getByTestId(container, 'preview-warning')).toBeInTheDocument();
  });
});
