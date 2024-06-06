/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import { useDateFormat, useTimeZone } from '../hooks/use_settings';

export const FormattedDate = React.memo<{ dateFormat?: string; value: Date }>(
  /* eslint-disable-next-line react-hooks/rules-of-hooks */
  ({ value, dateFormat = useDateFormat() }) => (
    <>{moment.tz(value, useTimeZone()).format(dateFormat)}</>
  )
);

FormattedDate.displayName = 'FormattedDate';
