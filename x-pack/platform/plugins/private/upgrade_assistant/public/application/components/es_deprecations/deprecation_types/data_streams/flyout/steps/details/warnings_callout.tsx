/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiLink } from '@elastic/eui';

import { useAppContext } from '../../../../../../../app_context';

interface Props {
  formattedDate: string;
}
export const DurationClarificationCallOut: React.FunctionComponent<Props> = ({ formattedDate }) => {
  const {
    services: {
      core: { docLinks },
    },
  } = useAppContext();
  const { links } = docLinks;

  return (
    <EuiCallOut color="primary">
      <p>
        Data indexed on or after {formattedDate} needs to be reindexed to a compatible format or
        marked as read-only.
        <br />
        <br />
        Depending on size and resources, reindexing may take extended time and your data will be in
        a read-only state until the job has completed. <EuiLink target="_blank">Learn more</EuiLink>
      </p>
    </EuiCallOut>
  );
};
