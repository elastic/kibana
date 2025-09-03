/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Job } from '../../../../../common/types/anomaly_detection_jobs';

import type { CustomUrlListProps } from './list';
import { CustomUrlList } from './list';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('../../../contexts/kibana');

jest.mock('../../../services/toast_notification_service', () => ({
  useToastNotificationService: () => {
    return {
      displayErrorToast: jest.fn(),
    };
  },
}));

function prepareTest(setCustomUrlsFn: jest.Mock) {
  const customUrls = [
    {
      url_name: 'Show data',
      time_range: 'auto',
      url_value:
        "discover#/?_g=(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a=" +
        '(index:e532ba80-b76f-11e8-a9dc-37914a458883,query:(language:lucene,query:\'airline:"$airline$"\'))',
    },
    {
      url_name: 'Show dashboard',
      time_range: '1h',
      url_value:
        'dashboards#/view/52ea8840-bbef-11e8-a04d-b1701b2b977e?_g=' +
        "(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&" +
        '_a=(filters:!(),query:(language:lucene,query:\'airline:"$airline$"\'))',
    },
    {
      url_name: 'Show airline',
      time_range: 'auto',
      url_value: 'http://airlinecodes.info/airline-code-$airline$',
    },
  ];

  const props: CustomUrlListProps = {
    job: { job_id: 'test', analysis_config: {} } as Job,
    customUrls,
    onChange: setCustomUrlsFn,
    dataViewListItems: [],
  };

  return render(
    <IntlProvider>
      <CustomUrlList {...props} />
    </IntlProvider>
  );
}

describe('CustomUrlList', () => {
  const setCustomUrls = jest.fn();

  test('renders a list of custom URLs', () => {
    const { container } = prepareTest(setCustomUrls);
    expect(container.firstChild).toMatchSnapshot();
  });

  test('switches custom URL field to textarea and calls setCustomUrls on change', async () => {
    const { getByTestId } = prepareTest(setCustomUrls);
    const user = userEvent.setup();

    const input = getByTestId('mlJobEditCustomUrlInput_0');
    await user.click(input);

    const textarea = getByTestId('mlJobEditCustomUrlTextarea_0');
    expect(textarea).toBeInTheDocument();

    await user.type(textarea, 'Edit');
    expect(setCustomUrls).toHaveBeenCalled();
  });
});
