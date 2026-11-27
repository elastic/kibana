/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from '@emotion/react';
import { render, screen } from '@testing-library/react';

import {
  getEmptyString,
  getEmptyStringTag,
  getEmptyCellValue,
  getEmptyValue,
  getOrEmptyTag,
} from '.';
import { getMockTheme } from '../../common/lib/kibana/kibana_react.mock';

describe('EmptyValue', () => {
  const mockTheme = getMockTheme({ euiTheme: { colors: { mediumShade: '#ece' } } });

  test('it renders the empty string placeholder', () => {
    render(<p>{getEmptyString()}</p>);
    expect(screen.getByText('(Empty String)')).toBeInTheDocument();
  });

  describe('#getEmptyValue', () => {
    test('should return an empty value', () => expect(getEmptyValue()).toBe('—'));
  });

  describe('#getEmptyString', () => {
    test('should turn into an empty string place holder', () => {
      render(
        <ThemeProvider theme={mockTheme}>
          <p>{getEmptyString()}</p>
        </ThemeProvider>
      );
      expect(screen.getByText('(Empty String)')).toBeInTheDocument();
    });
  });

  describe('#getEmptyCellValue', () => {
    test('should return an empty tag value', () => {
      render(
        <ThemeProvider theme={mockTheme}>
          <p>{getEmptyCellValue()}</p>
        </ThemeProvider>
      );
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('#getEmptyStringTag', () => {
    test('should turn into an empty string tag place holder', () => {
      render(
        <ThemeProvider theme={mockTheme}>
          <p>{getEmptyStringTag()}</p>
        </ThemeProvider>
      );
      expect(screen.getByText(getEmptyString())).toBeInTheDocument();
    });
  });

  describe('#getOrEmptyTag', () => {
    test('should default empty value when a deep rooted value is null', () => {
      const test = { a: { b: { c: null } } };
      render(
        <ThemeProvider theme={mockTheme}>
          <p>{getOrEmptyTag('a.b.c', test)}</p>
        </ThemeProvider>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });

    test('should default empty value when a deep rooted value is undefined', () => {
      const test = { a: { b: { c: undefined } } };
      render(
        <ThemeProvider theme={mockTheme}>
          <p>{getOrEmptyTag('a.b.c', test)}</p>
        </ThemeProvider>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });

    test('should default empty value when a deep rooted value is missing', () => {
      const test = { a: { b: {} } };
      render(
        <ThemeProvider theme={mockTheme}>
          <p>{getOrEmptyTag('a.b.c', test)}</p>
        </ThemeProvider>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });

    test('should return a deep path value', () => {
      const test = { a: { b: { c: 1 } } };
      render(<p>{getOrEmptyTag('a.b.c', test)}</p>);
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });
});
