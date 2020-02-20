/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { APMClient } from '../../../../../../services/rest/createCallApmApi';
import { CustomAction } from './';

export const saveCustomAction = ({
  callApmApi,
  customAction
}: {
  callApmApi: APMClient;
  customAction: CustomAction;
}) => {
  const { label, url, filters } = customAction;
  const customActionBody = {
    label,
    url,
    filters: filters
      .filter(({ key, value }) => !isEmpty(key) && !isEmpty(value))
      .reduce((acc: Record<string, string>, { key, value }) => {
        acc[key] = value;
        return acc;
      }, {})
  };
  console.log('### caue: customAction', customActionBody);
};
