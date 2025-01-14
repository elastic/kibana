/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import deepEqual from 'react-fast-compare';
import { trackCanvasUiMetric, METRIC_TYPE } from '../../lib/ui_metric';
import { getElementCounts } from '../../state/selectors/workpad';
import { getArgs } from '../../state/selectors/resolved_args';
import { State } from '../../../types';

const WorkpadLoadedMetric = 'workpad-loaded';
const WorkpadLoadedWithErrorsMetric = 'workpad-loaded-with-errors';

export { WorkpadLoadedMetric, WorkpadLoadedWithErrorsMetric };

// TODO: Build out full workpad types
/**
  Individual Page of a Workpad
 */
interface WorkpadPage {
  /** The elements on this Workpad Page */
  elements: Array<{ id: string }>;
}

/**
 A canvas workpad object
 */
interface Workpad {
  /** The pages of the workpad */
  pages: WorkpadPage[];
  /** The ID of the workpad */
  id: string;
}

/**
 Collection of resolved elements
 */
interface ResolvedArgs {
  [keys: string]: any;
}

export interface ElementsLoadedTelemetryProps {
  workpad: Workpad;
}

function areAllElementsInResolvedArgs(workpad: Workpad, resolvedArgs: ResolvedArgs): boolean {
  const resolvedArgsElements = Object.keys(resolvedArgs);

  const workpadElements = workpad.pages.reduce<string[]>((reduction, page) => {
    return [...reduction, ...page.elements.map((element) => element.id)];
  }, []);

  return workpadElements.every((element) => resolvedArgsElements.includes(element));
}

export const withUnconnectedElementsLoadedTelemetry = <P extends {}>(
  Component: React.ComponentType<P>,
  trackMetric = trackCanvasUiMetric
) =>
  function ElementsLoadedTelemetry(props: P & ElementsLoadedTelemetryProps) {
    const { workpad } = props;

    const [currentWorkpadId, setWorkpadId] = useState<string | undefined>(undefined);
    const [hasReported, setHasReported] = useState(false);
    const telemetryElementCounts = useSelector(
      (state: State) => getElementCounts(state),
      shallowEqual
    );

    const telemetryResolvedArgs = useSelector((state: State) => getArgs(state), deepEqual);

    const resolvedArgsAreForWorkpad = areAllElementsInResolvedArgs(workpad, telemetryResolvedArgs);
    const { error, pending } = telemetryElementCounts;
    const resolved = resolvedArgsAreForWorkpad && pending === 0;

    useEffect(() => {
      if (workpad.id !== currentWorkpadId) {
        const workpadElementCount = workpad.pages.reduce(
          (reduction, page) => reduction + page.elements.length,
          0
        );

        setWorkpadId(workpad.id);
        setHasReported(workpadElementCount === 0 || resolved);
      } else if (!hasReported && resolved) {
        if (error > 0) {
          trackMetric(METRIC_TYPE.LOADED, [WorkpadLoadedMetric, WorkpadLoadedWithErrorsMetric]);
        } else {
          trackMetric(METRIC_TYPE.LOADED, WorkpadLoadedMetric);
        }
        setHasReported(true);
      }
    }, [currentWorkpadId, hasReported, error, workpad.id, resolved, workpad.pages]);
    return <Component {...props} />;
  };

export const withElementsLoadedTelemetry = <P extends {}>(Component: React.ComponentType<P>) =>
  withUnconnectedElementsLoadedTelemetry(Component);
