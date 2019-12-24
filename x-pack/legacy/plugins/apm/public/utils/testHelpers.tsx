/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* global jest */

import { ReactWrapper } from 'enzyme';
import enzymeToJson from 'enzyme-to-json';
import { Location } from 'history';
import moment from 'moment';
import { Moment } from 'moment-timezone';
import React, { ReactNode } from 'react';
import { render, waitForElement } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { APMConfig } from '../../../../../plugins/apm/server';
import { LocationProvider } from '../context/LocationContext';
import { PromiseReturnType } from '../../typings/common';
import { ESFilter } from '../../typings/elasticsearch';
import {
  ApmPluginContext,
  ApmPluginContextValue
} from '../context/ApmPluginContext';
import { ConfigSchema } from '../new-platform/plugin';

export function toJson(wrapper: ReactWrapper) {
  return enzymeToJson(wrapper, {
    noKey: true,
    mode: 'deep'
  });
}

export function mockMoment() {
  // avoid timezone issues
  jest
    .spyOn(moment.prototype, 'format')
    .mockImplementation(function(this: Moment) {
      return `1st of January (mocking ${this.unix()})`;
    });

  // convert relative time to absolute time to avoid timing issues
  jest
    .spyOn(moment.prototype, 'fromNow')
    .mockImplementation(function(this: Moment) {
      return `1337 minutes ago (mocking ${this.unix()})`;
    });
}

// Useful for getting the rendered href from any kind of link component
export async function getRenderedHref(Component: React.FC, location: Location) {
  const el = render(
    <MockApmPluginContextWrapper>
      <MemoryRouter initialEntries={[location]}>
        <LocationProvider>
          <Component />
        </LocationProvider>
      </MemoryRouter>
    </MockApmPluginContextWrapper>
  );

  await waitForElement(() => el.container.querySelector('a'));

  const a = el.container.querySelector('a');
  return a ? a.getAttribute('href') : '';
}

export function mockNow(date: string | number | Date) {
  const fakeNow = new Date(date).getTime();
  return jest.spyOn(Date, 'now').mockReturnValue(fakeNow);
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function expectTextsNotInDocument(output: any, texts: string[]) {
  texts.forEach(text => {
    try {
      output.getByText(text);
    } catch (err) {
      if (err.message.startsWith('Unable to find an element with the text:')) {
        return;
      } else {
        throw err;
      }
    }

    throw new Error(`Unexpected text found: ${text}`);
  });
}

export function expectTextsInDocument(output: any, texts: string[]) {
  texts.forEach(text => {
    expect(output.getByText(text)).toBeInTheDocument();
  });
}

interface MockSetup {
  dynamicIndexPattern: any;
  start: number;
  end: number;
  client: any;
  internalClient: any;
  config: APMConfig;
  uiFiltersES: ESFilter[];
  indices: {
    'apm_oss.sourcemapIndices': string;
    'apm_oss.errorIndices': string;
    'apm_oss.onboardingIndices': string;
    'apm_oss.spanIndices': string;
    'apm_oss.transactionIndices': string;
    'apm_oss.metricsIndices': string;
    apmAgentConfigurationIndex: string;
  };
}

export async function inspectSearchParams(
  fn: (mockSetup: MockSetup) => Promise<any>
) {
  const clientSpy = jest.fn().mockReturnValueOnce({
    hits: {
      total: 0
    }
  });

  const internalClientSpy = jest.fn().mockReturnValueOnce({
    hits: {
      total: 0
    }
  });

  const mockSetup = {
    start: 1528113600000,
    end: 1528977600000,
    client: {
      search: clientSpy
    } as any,
    internalClient: {
      search: internalClientSpy
    } as any,
    config: new Proxy(
      {},
      {
        get: () => 'myIndex'
      }
    ) as APMConfig,
    uiFiltersES: [
      {
        term: { 'service.environment': 'prod' }
      }
    ],
    indices: {
      'apm_oss.sourcemapIndices': 'myIndex',
      'apm_oss.errorIndices': 'myIndex',
      'apm_oss.onboardingIndices': 'myIndex',
      'apm_oss.spanIndices': 'myIndex',
      'apm_oss.transactionIndices': 'myIndex',
      'apm_oss.metricsIndices': 'myIndex',
      apmAgentConfigurationIndex: 'myIndex'
    },
    dynamicIndexPattern: null as any
  };
  try {
    await fn(mockSetup);
  } catch {
    // we're only extracting the search params
  }

  let params;
  if (clientSpy.mock.calls.length) {
    params = clientSpy.mock.calls[0][0];
  } else {
    params = internalClientSpy.mock.calls[0][0];
  }

  return {
    params,
    teardown: () => clientSpy.mockClear()
  };
}

export type SearchParamsMock = PromiseReturnType<typeof inspectSearchParams>;

const mockCore = {
  chrome: {
    setBreadcrumbs: () => {}
  },
  http: {
    basePath: {
      prepend: (path: string) => `/basepath${path}`
    }
  },
  notifications: {
    toasts: {
      addWarning: () => {}
    }
  }
};

const mockConfig: ConfigSchema = {
  indexPatternTitle: 'apm-*',
  serviceMapEnabled: false,
  ui: {
    enabled: false
  }
};

export const mockApmPluginContextValue = {
  config: mockConfig,
  core: mockCore,
  packageInfo: { version: '0' },
  plugins: {}
};

export function MockApmPluginContextWrapper({
  children,
  value = {} as ApmPluginContextValue
}: {
  children?: ReactNode;
  value?: ApmPluginContextValue;
}) {
  return (
    <ApmPluginContext.Provider
      value={{
        ...mockApmPluginContextValue,
        ...value
      }}
    >
      {children}
    </ApmPluginContext.Provider>
  );
}
