/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { formatCommitDate } from '../../../common/commit_utils';
import { CommitSearchResultItem } from '../../../model';
import { Commit } from '../commits';

interface Props {
  query: string;
  results: CommitSearchResultItem[];
}

export const CommitResults = ({ results }: Props) => (
  <>
    {results.map(({ id, repoUri, message, date, committer }) => {
      const commitInfo = { message, committer: committer.name, id };
      const formattedDate = formatCommitDate(date);

      return (
        <div key={id} className="codeSearch__result">
          <Commit date={formattedDate} commit={commitInfo} repoUri={repoUri} />
        </div>
      );
    })}
  </>
);
