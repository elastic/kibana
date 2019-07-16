/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { useAppDependencies } from '../index';

interface Props {
  epochMs: number;
  type?: 'date' | 'time';
}

export const FormattedDateTime: React.FunctionComponent<Props> = ({ epochMs, type }) => {
  const {
    core: {
      i18n: { FormattedDate, FormattedTime },
    },
  } = useAppDependencies();

  const date = new Date(epochMs);

  return (
    <Fragment>
      {!type || type === 'date' ? (
        <FormattedDate value={date} year="numeric" month="short" day="2-digit" />
      ) : null}
      {!type ? ' ' : null}
      {!type || type === 'time' ? <FormattedTime value={date} timeZoneName="short" /> : null}
    </Fragment>
  );
};
