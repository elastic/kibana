/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { MlJobSelect } from './index';
import { useSiemJobs } from '../../../../../components/ml_popover/hooks/use_siem_jobs';
import { useFormFieldMock } from '../../../../../mock';
jest.mock('../../../../../components/ml_popover/hooks/use_siem_jobs');
jest.mock('../../../../../lib/kibana');

describe('MlJobSelect', () => {
  beforeAll(() => {
    (useSiemJobs as jest.Mock).mockReturnValue([false, []]);
  });

  it('renders correctly', () => {
    const Component = () => {
      const field = useFormFieldMock();

      return <MlJobSelect describedByIds={[]} field={field} />;
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive().find('[data-test-subj="mlJobSelect"]')).toHaveLength(1);
  });
});
