/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React, { Fragment } from 'react';
import { shallow } from 'enzyme';
import { ELASTICSEARCH_SYSTEM_ID } from '../../../common/constants';

const kibanaMock = {
  services: {
    http: vi.fn(),
  },
};

const onHttpErrorMock = vi.fn();

describe('SetupModeRenderer', () => {
  beforeEach(() => vi.resetModules());

  it('should render with setup mode disabled', () => {
    vi.doMock('../../lib/setup_mode', () => {
      const mocked = {
        getSetupModeState: () => ({
          supported: true,
          enabled: false,
        }),
        initSetupModeState: () => {},
        updateSetupModeData: () => {},
        markSetupModeSupported: () => {},
        markSetupModeUnsupported: () => {},
      };
      return { ...mocked, default: mocked };
    });
    const SetupModeRenderer = require('./setup_mode').WrappedSetupModeRenderer;

    const ChildComponent = () => <h1>Hi</h1>;
    const component = shallow(
      <SetupModeRenderer
        productName={ELASTICSEARCH_SYSTEM_ID}
        kibana={kibanaMock}
        onHttpError={onHttpErrorMock}
        render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
          <Fragment>
            {flyoutComponent}
            <ChildComponent setupMode={setupMode} />
            {bottomBarComponent}
          </Fragment>
        )}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render with setup mode enabled', () => {
    vi.doMock('../../lib/setup_mode', () => {
      const mocked = {
        getSetupModeState: () => ({
          supported: true,
          enabled: true,
          data: {
            elasticsearch: {},
            _meta: {},
          },
        }),
        initSetupModeState: () => {},
        updateSetupModeData: () => {},
        markSetupModeSupported: () => {},
        markSetupModeUnsupported: () => {},
      };
      return { ...mocked, default: mocked };
    });
    const SetupModeRenderer = require('./setup_mode').WrappedSetupModeRenderer;

    const ChildComponent = () => <h1>Hi</h1>;
    const component = shallow(
      <SetupModeRenderer
        productName={ELASTICSEARCH_SYSTEM_ID}
        kibana={kibanaMock}
        onHttpError={onHttpErrorMock}
        render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
          <Fragment>
            {flyoutComponent}
            <ChildComponent setupMode={setupMode} />
            {bottomBarComponent}
          </Fragment>
        )}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render the flyout open', () => {
    vi.doMock('../../lib/setup_mode', () => {
      const mocked = {
        getSetupModeState: () => ({
          supported: true,
          enabled: true,
          data: {
            elasticsearch: {
              byUuid: {},
            },
            _meta: {},
          },
        }),
        initSetupModeState: () => {},
        updateSetupModeData: () => {},
        markSetupModeSupported: () => {},
        markSetupModeUnsupported: () => {},
      };
      return { ...mocked, default: mocked };
    });
    const SetupModeRenderer = require('./setup_mode').WrappedSetupModeRenderer;

    const ChildComponent = () => <h1>Hi</h1>;
    const component = shallow(
      <SetupModeRenderer
        productName={ELASTICSEARCH_SYSTEM_ID}
        kibana={kibanaMock}
        onHttpError={onHttpErrorMock}
        render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
          <Fragment>
            {flyoutComponent}
            <ChildComponent setupMode={setupMode} />
            {bottomBarComponent}
          </Fragment>
        )}
      />
    );

    component.setState({ isFlyoutOpen: true });
    component.update();
    expect(component).toMatchSnapshot();
  });

  it('should handle a new node/instance scenario', () => {
    vi.doMock('../../lib/setup_mode', () => {
      const mocked = {
        getSetupModeState: () => ({
          supported: true,
          enabled: true,
          data: {
            elasticsearch: {
              byUuid: {},
            },
            _meta: {},
          },
        }),
        initSetupModeState: () => {},
        updateSetupModeData: () => {},
        markSetupModeSupported: () => {},
        markSetupModeUnsupported: () => {},
      };
      return { ...mocked, default: mocked };
    });
    const SetupModeRenderer = require('./setup_mode').WrappedSetupModeRenderer;

    const ChildComponent = () => <h1>Hi</h1>;
    const component = shallow(
      <SetupModeRenderer
        productName={ELASTICSEARCH_SYSTEM_ID}
        kibana={kibanaMock}
        onHttpError={onHttpErrorMock}
        render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
          <Fragment>
            {flyoutComponent}
            <ChildComponent setupMode={setupMode} />
            {bottomBarComponent}
          </Fragment>
        )}
      />
    );

    component.setState({ isFlyoutOpen: true, instance: null, isSettingUpNew: true });
    component.update();
    expect(component.find('Flyout').prop('product')).toEqual({ isNetNewUser: true });
  });

  it('should use a new product found in the api response', () => {
    const newProduct = { id: 1 };

    vi.useFakeTimers({ legacyFakeTimers: true });
    vi.doMock('../../lib/setup_mode', () => {
      const mocked = {
        getSetupModeState: () => ({
          supported: true,
          enabled: true,
          data: {
            elasticsearch: {
              byUuid: {
                2: newProduct,
              },
            },
            _meta: {},
          },
        }),
        initSetupModeState: (_globalState, _httpService, _onError, cb) => {
          setTimeout(() => {
            cb({
              elasticsearch: {
                byUuid: {
                  1: {},
                },
              },
            });
          }, 500);
        },
        updateSetupModeData: () => {},
        markSetupModeSupported: () => {},
        markSetupModeUnsupported: () => {},
      };
      return { ...mocked, default: mocked };
    });
    const SetupModeRenderer = require('./setup_mode').WrappedSetupModeRenderer;

    const ChildComponent = () => <h1>Hi</h1>;
    const component = shallow(
      <SetupModeRenderer
        productName={ELASTICSEARCH_SYSTEM_ID}
        kibana={kibanaMock}
        onHttpError={onHttpErrorMock}
        render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
          <Fragment>
            {flyoutComponent}
            <ChildComponent setupMode={setupMode} />
            {bottomBarComponent}
          </Fragment>
        )}
      />
    );

    component.setState({ isFlyoutOpen: true });
    component.update();

    vi.advanceTimersByTime(1000);
    expect(component.state('renderState')).toBe(true);
    expect(component.state('newProduct')).toBe(newProduct);
    expect(component.find('Flyout').prop('product')).toBe(newProduct);
  });

  it('should set the top menu items', () => {
    const newProduct = { id: 1 };

    vi.doMock('../../lib/setup_mode', () => {
      const mocked = {
        getSetupModeState: () => ({
          supported: true,
          enabled: true,
          data: {
            elasticsearch: {
              byUuid: {
                2: newProduct,
              },
            },
            _meta: {},
          },
        }),
        initSetupModeState: (_globalState, _httpService, _onError, cb) => {
          setTimeout(() => {
            cb({
              elasticsearch: {
                byUuid: {
                  1: {},
                },
              },
            });
          }, 500);
        },
        updateSetupModeData: () => {},
        markSetupModeSupported: () => {},
        markSetupModeUnsupported: () => {},
      };
      return { ...mocked, default: mocked };
    });
    const SetupModeRenderer = require('./setup_mode').WrappedSetupModeRenderer;

    const ChildComponent = () => <h1>Hi</h1>;
    const component = shallow(
      <SetupModeRenderer
        productName={ELASTICSEARCH_SYSTEM_ID}
        kibana={kibanaMock}
        onHttpError={onHttpErrorMock}
        render={({ setupMode, flyoutComponent, bottomBarComponent }) => (
          <Fragment>
            {flyoutComponent}
            <ChildComponent setupMode={setupMode} />
            {bottomBarComponent}
          </Fragment>
        )}
      />
    );

    component.setState({ isFlyoutOpen: true });
    component.update();
  });
});
