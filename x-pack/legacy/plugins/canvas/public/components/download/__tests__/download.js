/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import expect from '@kbn/expect';
import { render } from 'enzyme';
import { Download } from '../';

describe('<Download />', () => {
  it('has canvasDownload class', () => {
    const wrapper = render(
      <Download fileName="hello" content="world">
        <button>Download it</button>
      </Download>
    );

    expect(wrapper.hasClass('canvasDownload')).to.be.ok;
  });
});
