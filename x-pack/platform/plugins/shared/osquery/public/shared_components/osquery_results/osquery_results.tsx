/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';

import { EmptyPrompt } from '../../routes/components/empty_prompt';
import { useKibana } from '../../common/lib/kibana';

import type { OsqueryActionResultsProps } from './types';
import { OsqueryActionResult } from './osquery_result';
import type { ServicesWrapperProps } from '../services_wrapper';
import ServicesWrapper from '../services_wrapper';

const OsqueryActionResultsComponent: React.FC<OsqueryActionResultsProps> = ({
  ruleName,
  actionItems,
  ecsData,
  addToTimeline,
}) => {
  const { read } = useKibana().services.application.capabilities.osquery;

  return !read ? (
    <EmptyPrompt />
  ) : (
    <div data-test-subj={'osquery-results'}>
      {actionItems?.map((item) => {
        const actionId = item.fields?.action_id?.[0];
        const startDate = item.fields?.['@timestamp']?.[0];

        return (
          <React.Fragment key={actionId}>
            <EuiSpacer size="s" />
            <OsqueryActionResult
              actionId={actionId}
              startDate={startDate}
              ruleName={ruleName}
              ecsData={ecsData}
              addToTimeline={addToTimeline}
            />
            <EuiSpacer size="s" />
          </React.Fragment>
        );
      })}
      <EuiSpacer size="s" />
    </div>
  );
};

export const OsqueryActionResults = React.memo(OsqueryActionResultsComponent);

type OsqueryActionResultsWrapperProps = {
  services: ServicesWrapperProps['services'];
} & OsqueryActionResultsProps;

const OsqueryActionResultsWrapperComponent: React.FC<OsqueryActionResultsWrapperProps> = ({
  services,
  ...restProps
}) => (
  <ServicesWrapper services={services}>
    <OsqueryActionResults {...restProps} />
  </ServicesWrapper>
);

const OsqueryActionResultsWrapper = React.memo(OsqueryActionResultsWrapperComponent);

// eslint-disable-next-line import/no-default-export
export { OsqueryActionResultsWrapper as default };
