/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import '../../../mock/ui_settings';
import { TestProviders } from '../../../mock';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from './index';

jest.mock('../../../lib/settings/use_kibana_ui_setting');

describe('UtilityBar', () => {
  test('it renders', () => {
    const wrapper = shallow(
      <TestProviders>
        <UtilityBar>
          <UtilityBarSection>
            <UtilityBarGroup>
              <UtilityBarText>{'Test text'}</UtilityBarText>
            </UtilityBarGroup>

            <UtilityBarGroup>
              <UtilityBarAction iconType="" popoverContent={() => <p>{'Test popover'}</p>}>
                {'Test action'}
              </UtilityBarAction>
            </UtilityBarGroup>
          </UtilityBarSection>

          <UtilityBarSection>
            <UtilityBarGroup>
              <UtilityBarAction iconType="cross">{'Test action'}</UtilityBarAction>
            </UtilityBarGroup>
          </UtilityBarSection>
        </UtilityBar>
      </TestProviders>
    );

    expect(toJson(wrapper.find('UtilityBar'))).toMatchSnapshot();
  });

  test('it applies border styles when border is true', () => {
    const wrapper = mount(
      <TestProviders>
        <UtilityBar border>
          <UtilityBarSection>
            <UtilityBarGroup>
              <UtilityBarText>{'Test text'}</UtilityBarText>
            </UtilityBarGroup>

            <UtilityBarGroup>
              <UtilityBarAction iconType="" popoverContent={() => <p>{'Test popover'}</p>}>
                {'Test action'}
              </UtilityBarAction>
            </UtilityBarGroup>
          </UtilityBarSection>

          <UtilityBarSection>
            <UtilityBarGroup>
              <UtilityBarAction iconType="cross">{'Test action'}</UtilityBarAction>
            </UtilityBarGroup>
          </UtilityBarSection>
        </UtilityBar>
      </TestProviders>
    );
    const siemUtilityBar = wrapper.find('.siemUtilityBar').first();

    expect(siemUtilityBar).toHaveStyleRule('border-bottom', euiDarkVars.euiBorderThin);
    expect(siemUtilityBar).toHaveStyleRule('padding-bottom', euiDarkVars.paddingSizes.s);
  });

  test('it DOES NOT apply border styles when border is false', () => {
    const wrapper = mount(
      <TestProviders>
        <UtilityBar>
          <UtilityBarSection>
            <UtilityBarGroup>
              <UtilityBarText>{'Test text'}</UtilityBarText>
            </UtilityBarGroup>

            <UtilityBarGroup>
              <UtilityBarAction iconType="" popoverContent={() => <p>{'Test popover'}</p>}>
                {'Test action'}
              </UtilityBarAction>
            </UtilityBarGroup>
          </UtilityBarSection>

          <UtilityBarSection>
            <UtilityBarGroup>
              <UtilityBarAction iconType="cross">{'Test action'}</UtilityBarAction>
            </UtilityBarGroup>
          </UtilityBarSection>
        </UtilityBar>
      </TestProviders>
    );
    const siemUtilityBar = wrapper.find('.siemUtilityBar').first();

    expect(siemUtilityBar).not.toHaveStyleRule('border-bottom', euiDarkVars.euiBorderThin);
    expect(siemUtilityBar).not.toHaveStyleRule('padding-bottom', euiDarkVars.paddingSizes.s);
  });
});
