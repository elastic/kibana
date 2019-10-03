/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import React from 'react';
import { shallow } from 'enzyme';
import { getRenderedHref } from '../../../../utils/testHelpers';
import { KibanaLink } from '../KibanaLink';
import * as kibanaCore from '../../../../../../observability/public/context/kibana_core';
import { LegacyCoreStart } from 'src/core/public';

describe('KibanaLink', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('produces the correct URL with context', async () => {
    const coreMock = ({
      http: {
        basePath: {
          prepend: (path: string) => `/basepath${path}`
        }
      }
    } as unknown) as LegacyCoreStart;

    jest.spyOn(kibanaCore, 'useKibanaCore').mockReturnValue(coreMock);
    const href = await getRenderedHref(() => <KibanaLink path="/some/path" />, {
      search: '?rangeFrom=now-5h&rangeTo=now-2h'
    } as Location);
    expect(href).toMatchInlineSnapshot(`"/basepath/app/kibana#/some/path"`);
  });

  it('produces the correct URL without context', async () => {
    const coreMock = ({
      http: {
        basePath: {
          prepend: (path: string) => `/basepath${path}`
        }
      }
    } as unknown) as LegacyCoreStart;

    const href = await getRenderedHref(
      () => <KibanaLink path="/some/path" core={coreMock} />,
      {
        search: '?rangeFrom=now-5h&rangeTo=now-2h'
      } as Location
    );
    expect(href).toMatchInlineSnapshot(`"/basepath/app/kibana#/some/path"`);
  });

  it('returns null if no context nor core is provided', () => {
    const component = shallow(<KibanaLink path="/some/path" />);
    expect(component.isEmptyRender()).toBeTruthy();
  });
});
