/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { useAppDependencies } from '../index';

interface Props {
  epochMs: number;
}

export const FormattedDateTime: React.FunctionComponent<Props> = ({ epochMs }) => {
  const {
    core: {
      i18n: { FormattedDate, FormattedTime },
    },
  } = useAppDependencies();

  const date = new Date(epochMs);

  return (
    <Fragment>
      <FormattedDate value={date} year="numeric" month="short" day="2-digit" />{' '}
      <FormattedTime value={date} timeZoneName="short" />
    </Fragment>
  );
};
