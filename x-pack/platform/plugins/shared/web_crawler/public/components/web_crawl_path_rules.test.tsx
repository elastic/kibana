/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithWebCrawlerContext } from '../test_utils';
import { INVALID_PATHS_MESSAGE, WebCrawlPathRules } from './web_crawl_path_rules';

interface RenderProps {
  includePaths?: string;
  excludePaths?: string;
  isIncludeInvalid?: boolean;
  isExcludeInvalid?: boolean;
  isDisabled?: boolean;
  compressed?: boolean;
}

describe('WebCrawlPathRules', () => {
  const onIncludePathsChange = jest.fn();
  const onExcludePathsChange = jest.fn();

  const renderPathRules = (props: RenderProps = {}) =>
    renderWithWebCrawlerContext(
      <WebCrawlPathRules
        includePaths=""
        excludePaths=""
        isIncludeInvalid={false}
        isExcludeInvalid={false}
        onIncludePathsChange={onIncludePathsChange}
        onExcludePathsChange={onExcludePathsChange}
        {...props}
      />
    );

  const getIncludeInput = () => screen.getByTestId('webCrawlIncludePaths');
  const getExcludeInput = () => screen.getByTestId('webCrawlExcludePaths');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('explains how to enter paths in its validation message', () => {
    expect(INVALID_PATHS_MESSAGE).toBe(
      'Enter up to 20 paths that start with a /, separated by commas.'
    );
  });

  it('renders two enabled, valid text inputs labeled by what they do', () => {
    renderPathRules();

    expect(screen.getByText('Only paths')).toBeInTheDocument();
    expect(screen.getByText('Skip paths')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toEqual([getIncludeInput(), getExcludeInput()]);
    expect(getIncludeInput()).toBeEnabled();
    expect(getIncludeInput()).not.toBeInvalid();
    expect(getExcludeInput()).toBeEnabled();
    expect(getExcludeInput()).not.toBeInvalid();
  });

  it('gives both inputs an accessible name', () => {
    renderPathRules();

    expect(
      screen.getByRole('textbox', {
        name: 'Only crawl pages under these paths, separated by commas',
      })
    ).toBe(getIncludeInput());
    expect(
      screen.getByRole('textbox', {
        name: 'Do not crawl pages under these paths, separated by commas',
      })
    ).toBe(getExcludeInput());
  });

  it('shows an example of each list while it is empty', () => {
    renderPathRules();

    expect(getIncludeInput()).toHaveAttribute('placeholder', '/docs, /blog');
    expect(getExcludeInput()).toHaveAttribute('placeholder', '/tags, /search');
  });

  it('shows the text it was given, as typed', () => {
    renderPathRules({ includePaths: '/docs,  /blog,', excludePaths: ' /tags /search' });

    expect(getIncludeInput()).toHaveValue('/docs,  /blog,');
    expect(getExcludeInput()).toHaveValue(' /tags /search');
  });

  it('reports the text typed into only paths, and nothing for skip paths', () => {
    renderPathRules();

    fireEvent.change(getIncludeInput(), { target: { value: '/docs, blog ' } });

    expect(onIncludePathsChange).toHaveBeenCalledTimes(1);
    expect(onIncludePathsChange).toHaveBeenCalledWith('/docs, blog ');
    expect(onExcludePathsChange).not.toHaveBeenCalled();
  });

  it('reports the text typed into skip paths, and nothing for only paths', () => {
    renderPathRules();

    fireEvent.change(getExcludeInput(), { target: { value: '/tags' } });

    expect(onExcludePathsChange).toHaveBeenCalledTimes(1);
    expect(onExcludePathsChange).toHaveBeenCalledWith('/tags');
    expect(onIncludePathsChange).not.toHaveBeenCalled();
  });

  it('reports a cleared input as empty text', () => {
    renderPathRules({ includePaths: '/docs' });

    fireEvent.change(getIncludeInput(), { target: { value: '' } });

    expect(onIncludePathsChange).toHaveBeenCalledWith('');
  });

  it('is controlled: it keeps showing the given text until its props change', () => {
    renderPathRules({ includePaths: '/docs' });

    fireEvent.change(getIncludeInput(), { target: { value: '/blog' } });

    expect(getIncludeInput()).toHaveValue('/docs');
  });

  it('marks only the only paths input invalid', () => {
    renderPathRules({ isIncludeInvalid: true });

    expect(getIncludeInput()).toBeInvalid();
    expect(getExcludeInput()).not.toBeInvalid();
  });

  it('marks only the skip paths input invalid', () => {
    renderPathRules({ isExcludeInvalid: true });

    expect(getExcludeInput()).toBeInvalid();
    expect(getIncludeInput()).not.toBeInvalid();
  });

  it('marks both inputs invalid without showing a message of its own', () => {
    renderPathRules({ isIncludeInvalid: true, isExcludeInvalid: true });

    expect(getIncludeInput()).toBeInvalid();
    expect(getExcludeInput()).toBeInvalid();
    expect(screen.queryByText(INVALID_PATHS_MESSAGE)).not.toBeInTheDocument();
  });

  it('disables both inputs', () => {
    renderPathRules({ isDisabled: true });

    expect(getIncludeInput()).toBeDisabled();
    expect(getExcludeInput()).toBeDisabled();
  });

  it.each([
    [true, true],
    [false, false],
  ])('renders compressed inputs when compressed is %p', (compressed, isCompressed) => {
    renderPathRules({ compressed });

    expect(/compressed/.test(getIncludeInput().className)).toBe(isCompressed);
    expect(/compressed/.test(getExcludeInput().className)).toBe(isCompressed);
  });
});
