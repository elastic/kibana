/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ErrorMetadata } from '..';
import { render, cleanup } from 'react-testing-library';
import { APMError } from '../../../../../../typings/es_schemas/ui/APMError';
import 'jest-dom/extend-expect';
import {
  expectTextsInDocument,
  expectTextsNotInDocument
} from '../../../../../utils/testHelpers';

function getError() {
  return ({
    labels: { someKey: 'labels value' },
    http: { someKey: 'http value' },
    host: { someKey: 'host value' },
    container: { someKey: 'container value' },
    service: { someKey: 'service value' },
    process: { someKey: 'process value' },
    agent: { someKey: 'agent value' },
    url: { someKey: 'url value' },
    user: { someKey: 'user value' },
    notIncluded: 'not included value',
    error: {
      notIncluded: 'error not included value',
      custom: {
        someKey: 'custom value'
      }
    }
  } as unknown) as APMError;
}

describe('ErrorMetadata', () => {
  afterEach(cleanup);

  it('should render a error with all sections', () => {
    const error = getError();
    const output = render(<ErrorMetadata error={error} />);

    // sections
    expectTextsInDocument(output, [
      'Labels',
      'HTTP',
      'Host',
      'Container',
      'Service',
      'Process',
      'Agent',
      'URL',
      'User',
      'Custom'
    ]);
  });

  it('should render a error with all included dot notation keys', () => {
    const error = getError();
    const output = render(<ErrorMetadata error={error} />);

    // included keys
    expectTextsInDocument(output, [
      'labels.someKey',
      'http.someKey',
      'host.someKey',
      'container.someKey',
      'service.someKey',
      'process.someKey',
      'agent.someKey',
      'url.someKey',
      'user.someKey',
      'error.custom.someKey'
    ]);

    // excluded keys
    expectTextsNotInDocument(output, ['notIncluded', 'error.notIncluded']);
  });

  it('should render a error with all included values', () => {
    const error = getError();
    const output = render(<ErrorMetadata error={error} />);

    // included values
    expectTextsInDocument(output, [
      'labels value',
      'http value',
      'host value',
      'container value',
      'service value',
      'process value',
      'agent value',
      'url value',
      'user value',
      'custom value'
    ]);

    // excluded values
    expectTextsNotInDocument(output, [
      'not included value',
      'error not included value'
    ]);
  });

  it('should render a error with only the required sections', () => {
    const error = {} as APMError;
    const output = render(<ErrorMetadata error={error} />);

    // required sections should be found
    expectTextsInDocument(output, ['Labels', 'User']);

    // optional sections should NOT be found
    expectTextsNotInDocument(output, [
      'HTTP',
      'Host',
      'Container',
      'Service',
      'Process',
      'Agent',
      'URL',
      'Custom'
    ]);
  });
});
