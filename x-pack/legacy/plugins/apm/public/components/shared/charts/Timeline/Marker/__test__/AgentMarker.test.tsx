/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { AgentMarker } from '../AgentMarker';
import { IWaterfallAgentMark } from '../../../../../app/TransactionDetails/WaterfallWithSummmary/WaterfallContainer/Waterfall/waterfall_helpers/waterfall_helpers';

describe('AgentMarker', () => {
  const mark = {
    doc: {
      mark: 'foo'
    },
    offset: 10000,
    docType: 'agentMark'
  } as IWaterfallAgentMark;
  it('renders', () => {
    const component = shallow(<AgentMarker mark={mark} />);
    expect(component).toMatchSnapshot();
  });
});
