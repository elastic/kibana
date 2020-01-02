/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { EuiBasicTable, EuiText } from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { CategorizationJobCreator } from '../../../../../common/job_creator';
import { Results } from '../../../../../common/results_loader';
import { ml } from '../../../../../../../services/ml_api_service';

const DTR_IDX = 0;

interface Category {
  // MOVE!!!!!!!
  job_id: string;
  category_id: number;
  terms: string;
  regex: string;
  max_matching_length: number;
  examples: string[];
  grok_pattern: string;
}

export const TopCategories: FC = () => {
  const { jobCreator: jc, chartLoader, resultsLoader, chartInterval } = useContext(
    JobCreatorContext
  );
  const jobCreator = jc as CategorizationJobCreator;

  const [categories, setCategories] = useState<Category[]>([]);
  const [tableRow, setTableRow] = useState<Array<{ count: number; example: string }>>([]);
  const [totalCategories, setTotalCategories] = useState(0);

  function setResultsWrapper(results: Results) {
    loadTopCats();
  }

  async function loadTopCats() {
    const results = await ml.jobs.topCategories(jobCreator.jobId, 5);
    setCategories(results.categories);
    setTableRow(
      results.categories.map(c => ({
        count: c.count,
        example: c.category.examples?.length ? c.category.examples[0] : '',
      }))
    );
    setTotalCategories(results.total);
    // console.log(topCats.total);
  }

  useEffect(() => {
    // subscribe to result updates
    const resultsSubscription = resultsLoader.subscribeToResults(setResultsWrapper);
    return () => {
      resultsSubscription.unsubscribe();
    };
  }, []);

  const columns = [
    {
      field: 'count',
      name: 'count',
      width: '100px',
      render: (count: any) => (
        <EuiText size="s">
          <code>{count}</code>
        </EuiText>
      ),
    },
    {
      field: 'example',
      name: 'Example',
      render: (example: any) => (
        <EuiText size="s">
          <code>{example}</code>
        </EuiText>
      ),
    },
  ];

  return (
    <>
      {totalCategories > 0 && (
        <>
          <div>Total categories: {totalCategories}</div>
          <EuiBasicTable columns={columns} items={tableRow} />
        </>
      )}
    </>
  );
};
