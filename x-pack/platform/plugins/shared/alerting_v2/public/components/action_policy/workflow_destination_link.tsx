/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import React from 'react';
import { useFetchWorkflow } from '../../hooks/use_fetch_workflow';

interface WorkflowDestinationLinkProps {
  id: string;
  isEnabled?: boolean;
}

export const WorkflowDestinationLink = ({ id, isEnabled = true }: WorkflowDestinationLinkProps) => {
  const application = useService(CoreStart('application'));
  const { data: workflow } = useFetchWorkflow(id, isEnabled);

  return (
    <EuiLink
      href={application.getUrlForApp(WORKFLOWS_APP_ID, { path: `/${id}` })}
      target="_blank"
      rel="noopener noreferrer"
    >
      {workflow?.name ?? id}
    </EuiLink>
  );
};
