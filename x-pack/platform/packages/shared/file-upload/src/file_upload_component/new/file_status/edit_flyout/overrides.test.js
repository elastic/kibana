/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { FILE_FORMATS } from '@kbn/file-upload-common';

import { Overrides } from './overrides';

vi.mock('@kbn/kibana-react-plugin/public', () => {
      const mocked = {
      withKibana: (comp) => {
        return comp;
      },
    };
      return { ...mocked, default: mocked };
    });

function getProps() {
  return {
    setOverrides: () => {},
    overrides: {},
    originalSettings: {},
    defaultSettings: {},
    setApplyOverrides: () => {},
    fields: [],
    kibana: {
      services: {
        docLinks: {
          links: {
            aggs: {
              date_format_pattern: 'jest-metadata-mock-url',
            },
          },
        },
      },
    },
  };
}

describe('Overrides', () => {
  test('render overrides and trigger a state change', () => {
    const FORMAT_1 = FILE_FORMATS.DELIMITED;
    const FORMAT_2 = FILE_FORMATS.NDJSON;

    const props = getProps();
    props.overrides.format = FORMAT_1;

    const component = mountWithIntl(<Overrides {...props} />);

    expect(component.state('overrides').format).toEqual(FORMAT_1);

    component.instance().onFormatChange([{ label: FORMAT_2 }]);

    expect(component.state('overrides').format).toEqual(FORMAT_2);
  });
});
