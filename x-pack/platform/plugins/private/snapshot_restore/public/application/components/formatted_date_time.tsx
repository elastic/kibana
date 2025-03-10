/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { FormattedDate, FormattedTime } from '@kbn/i18n-react';

interface Props {
  epochMs: number;
  type?: 'date' | 'time';
}

export const FormattedDateTime: React.FunctionComponent<Props> = ({ epochMs, type }) => {
  const date = new Date(epochMs);
  const formattedDate = <FormattedDate value={date} year="numeric" month="short" day="2-digit" />;
  const formattedTime = <FormattedTime value={date} timeZoneName="short" />;

  if (type) {
    return type === 'date' ? formattedDate : formattedTime;
  }

  return (
    <Fragment>
      {formattedDate} {formattedTime}
    </Fragment>
  );
};
