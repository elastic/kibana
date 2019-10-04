/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import { JobCreatorContext } from '../../../job_creator_context';
import { MLJobEditor } from '../../../../../../jobs_list/components/ml_job_editor';
import { Description } from './description';
import { isValidJson } from '../../../../../../../../common/util/validation_utils';
import { AdvancedJobCreator } from '../../../../../common/job_creator';

const EDITOR_HEIGHT = '400px';

export const QueryInput: FC<{ setValidQuery(v: boolean): void }> = ({ setValidQuery }) => {
  const { jobCreator: jc, jobCreatorUpdate } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator;
  const [queryString, setQueryString] = useState(JSON.stringify(jobCreator.query, null, 2));

  useEffect(() => {
    const validJson = isValidJson(queryString);
    setValidQuery(validJson);
    if (validJson) {
      jobCreator.query = JSON.parse(queryString);
      jobCreatorUpdate();
    }
  }, [queryString]);

  useEffect(() => {
    const validJson = isValidJson(queryString);
    setValidQuery(validJson);
  }, []);

  function onChange(qs: string) {
    setQueryString(qs);
  }

  return (
    <Description>
      <MLJobEditor
        value={queryString}
        height={EDITOR_HEIGHT}
        readOnly={false}
        onChange={onChange}
      />
    </Description>
  );
};
