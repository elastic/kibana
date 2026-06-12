/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useContext, useEffect } from 'react';
import { JobCreatorContext } from '../../../job_creator_context';
import { MLJobEditor } from '../../../../../../jobs_list/components/ml_job_editor';
import { Description } from './description';
import { isValidJson } from '../../../../../../../../../common/util/validation_utils';
import type { AdvancedJobCreator } from '../../../../../common/job_creator';

const EDITOR_HEIGHT = '400px';

export const QueryInput: FC<{ setIsValidQuery(v: boolean): void }> = ({ setIsValidQuery }) => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator;
  const [queryString, setQueryString] = useState(JSON.stringify(jobCreator.query, null, 2));

  useEffect(() => {
    const validJson = isValidJson(queryString);
    setIsValidQuery(validJson);
    if (validJson) {
      jobCreator.query = JSON.parse(queryString);
      jobCreatorUpdate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  useEffect(() => {
    if (isValidJson(queryString)) {
      // the query object may have changed outside of this component,
      // compare the current query with the local queryString by reformatting both
      const query = JSON.parse(queryString);
      const newQueryString = JSON.stringify(query, null, 2);
      const actualQuery = JSON.stringify(jobCreator.query, null, 2);
      if (newQueryString !== actualQuery) {
        setQueryString(actualQuery);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  useEffect(() => {
    const validJson = isValidJson(queryString);
    setIsValidQuery(validJson);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
