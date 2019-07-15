/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { JobCreatorContext } from '../../../../../job_creator_context';
import { Description } from './description';

export const ModelMemoryLimitInput: FC = () => {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);
  const [modelMemoryLimit, setModelMemoryLimit] = useState(
    jobCreator.modelMemoryLimit === null ? '' : jobCreator.modelMemoryLimit
  );

  useEffect(() => {
    jobCreator.modelMemoryLimit = modelMemoryLimit === '' ? null : modelMemoryLimit;
    jobCreatorUpdate();
  }, [modelMemoryLimit]);

  return (
    <Description>
      <EuiFieldText
        // placeholder="Job Id"
        value={modelMemoryLimit}
        onChange={e => setModelMemoryLimit(e.target.value)}
      />
    </Description>
  );
};
