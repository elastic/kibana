/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { InferenceServiceFormFields } from '@kbn/inference-endpoint-ui-common';
import { type ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { useConnectorContext } from '@kbn/triggers-actions-ui-plugin/public';
import { SolutionView } from '@kbn/spaces-plugin/common';

const solutionMap = {
  observability: 'oblt',
  search: 'es',
} as { [key: string]: SolutionView };

const InferenceAPIConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  isEdit,
}) => {
  const {
    cloud,
    http,
    notifications: { toasts },
    spaces,
    isServerless: isServerlessKibanaContext,
  } = useKibana().services;
  const isMounted = useMountedState();
  const { isServerless: isServerlessConnectorContext } = useConnectorContext();
  const isServerless = isServerlessKibanaContext ?? isServerlessConnectorContext;

  const [activeSpaceSolution, setActiveSpaceSolution] = useState<SolutionView | undefined>();

  const currentSolution = useMemo(() => {
    let solution: SolutionView | undefined;
    if (isServerless) {
      const projectType = cloud?.serverless?.projectType;
      solution = (
        projectType && solutionMap[projectType] ? solutionMap[projectType] : projectType
      ) as SolutionView;
    } else {
      solution = activeSpaceSolution;
    }
    return solution;
  }, [isServerless, activeSpaceSolution, cloud?.serverless?.projectType]);

  useEffect(() => {
    async function getSolution() {
      if (!isMounted() || !spaces?.getActiveSpace) {
        return;
      }
      const space = await spaces?.getActiveSpace();
      setActiveSpaceSolution(space?.solution);
    }
    getSolution();
  }, [spaces, spaces?.getActiveSpace, isMounted]);

  return (
    <InferenceServiceFormFields
      http={http}
      isEdit={isEdit}
      enforceAdaptiveAllocations={isServerless}
      currentSolution={currentSolution}
      toasts={toasts}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { InferenceAPIConnectorFields as default };
