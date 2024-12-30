/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { shallow } from 'enzyme';
import { FormattedMessage } from '@kbn/i18n-react';
import { ForLastExpression } from './for_the_last';

describe('for the last expression', () => {
  it('renders with defined options', () => {
    const onChangeWindowSize = jest.fn();
    const onChangeWindowUnit = jest.fn();
    const wrapper = shallow(
      <ForLastExpression
        errors={{ timeWindowSize: [] }}
        timeWindowSize={5}
        timeWindowUnit={'m'}
        onChangeWindowSize={onChangeWindowSize}
        onChangeWindowUnit={onChangeWindowUnit}
      />
    );
    expect(wrapper.find('[data-test-subj="timeWindowSizeNumber"]').length > 0).toBeTruthy();
  });

  it('renders with default timeWindowSize and timeWindowUnit', () => {
    const onChangeWindowSize = jest.fn();
    const onChangeWindowUnit = jest.fn();
    const wrapper = shallow(
      <ForLastExpression
        errors={{ timeWindowSize: [] }}
        onChangeWindowSize={onChangeWindowSize}
        onChangeWindowUnit={onChangeWindowUnit}
      />
    );
    wrapper.simulate('click');
    expect(wrapper.find('[value=""]').length > 0).toBeTruthy();
    expect(wrapper.find('[value="s"]').length > 0).toBeTruthy();
    expect(
      wrapper.contains(
        <FormattedMessage
          id="xpack.triggersActionsUI.common.expressionItems.forTheLast.popoverTitle"
          defaultMessage="For the last"
        />
      )
    ).toBeTruthy();
  });
});
