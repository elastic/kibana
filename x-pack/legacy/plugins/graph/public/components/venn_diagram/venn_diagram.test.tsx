/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { VennDiagram } from './venn_diagram';

describe('venn_diagram', () => {
  it('should render svg with correct coordinates', () => {
    const instance = shallow(<VennDiagram leftValue={30} rightValue={60} overlap={6} />);
    expect(instance).toMatchInlineSnapshot(`
      <div>
        <svg
          height={60}
          viewBox="0 0 17.480774889473267 8.740387444736633"
          width={100}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g>
            <circle
              className="gphVennDiagram__left"
              cx={5.284377114585398}
              cy={4.370193722368317}
              r={3.0901936161855166}
            />
            <circle
              className="gphVennDiagram__right"
              cx={10.91639766870507}
              cy={4.370193722368317}
              r={4.370193722368317}
            />
          </g>
        </svg>
      </div>
    `);
  });

  it('should also work for very big numbers', () => {
    const instance = shallow(<VennDiagram leftValue={30000} rightValue={60000} overlap={6000} />);
    expect(instance).toMatchInlineSnapshot(`
      <div>
        <svg
          height={60}
          viewBox="0 0 552.7906391541368 276.3953195770684"
          width={100}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g>
            <circle
              className="gphVennDiagram__left"
              cx={167.10667697398674}
              cy={138.1976597885342}
              r={97.720502380584}
            />
            <circle
              className="gphVennDiagram__right"
              cx={345.20680477219986}
              cy={138.1976597885342}
              r={138.1976597885342}
            />
          </g>
        </svg>
      </div>
    `);
  });
});
