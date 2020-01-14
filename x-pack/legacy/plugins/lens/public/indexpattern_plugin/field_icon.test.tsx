/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { FieldIcon } from './field_icon';

describe('FieldIcon', () => {
  it('should render icons', () => {
    expect(shallow(<FieldIcon type="boolean" />)).toMatchInlineSnapshot(`
      <EuiIcon
        className="lnsFieldListPanel__fieldIcon lnsFieldListPanel__fieldIcon--boolean"
        color="#FAE181"
        type="invert"
      />
    `);
    expect(shallow(<FieldIcon type="date" />)).toMatchInlineSnapshot(`
      <EuiIcon
        className="lnsFieldListPanel__fieldIcon lnsFieldListPanel__fieldIcon--date"
        color="#F19F58"
        type="calendar"
      />
    `);
    expect(shallow(<FieldIcon type="number" />)).toMatchInlineSnapshot(`
      <EuiIcon
        className="lnsFieldListPanel__fieldIcon lnsFieldListPanel__fieldIcon--number"
        color="#5BBAA0"
        type="number"
      />
    `);
    expect(shallow(<FieldIcon type="string" />)).toMatchInlineSnapshot(`
      <EuiIcon
        className="lnsFieldListPanel__fieldIcon lnsFieldListPanel__fieldIcon--string"
        color="#EEAFCF"
        type="string"
      />
    `);
    expect(shallow(<FieldIcon type="ip" />)).toMatchInlineSnapshot(`
      <EuiIcon
        className="lnsFieldListPanel__fieldIcon lnsFieldListPanel__fieldIcon--ip"
        color="#B46F5F"
        type="ip"
      />
    `);
  });
});
