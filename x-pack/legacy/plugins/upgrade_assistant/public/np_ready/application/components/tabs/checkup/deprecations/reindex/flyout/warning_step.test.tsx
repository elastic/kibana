/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nProvider } from '@kbn/i18n/react';
import { mount, shallow } from 'enzyme';
import React from 'react';

import { ReindexWarning } from '../../../../../../../../../common/types';
import { idForWarning, WarningsFlyoutStep } from './warnings_step';

describe('WarningsFlyoutStep', () => {
  const defaultProps = {
    advanceNextStep: jest.fn(),
    warnings: [ReindexWarning.allField, ReindexWarning.booleanFields],
    closeFlyout: jest.fn(),
  };

  it('renders', () => {
    expect(shallow(<WarningsFlyoutStep {...defaultProps} />)).toMatchSnapshot();
  });

  it('does not allow proceeding until all are checked', () => {
    const wrapper = mount(
      <I18nProvider>
        <WarningsFlyoutStep {...defaultProps} />
      </I18nProvider>
    );
    const button = wrapper.find('EuiButton');

    button.simulate('click');
    expect(defaultProps.advanceNextStep).not.toHaveBeenCalled();

    wrapper.find(`input#${idForWarning(ReindexWarning.allField)}`).simulate('change');
    button.simulate('click');
    expect(defaultProps.advanceNextStep).not.toHaveBeenCalled();

    wrapper.find(`input#${idForWarning(ReindexWarning.booleanFields)}`).simulate('change');
    button.simulate('click');
    expect(defaultProps.advanceNextStep).toHaveBeenCalled();
  });
});
