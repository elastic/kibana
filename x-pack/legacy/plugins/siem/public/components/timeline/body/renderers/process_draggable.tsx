/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isNumber, isString } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';

import { DraggableBadge } from '../../../draggables';

import * as i18n from './translations';

export const isNillOrEmptyString = (value: string | number | null | undefined) => {
  if (value == null) {
    return true;
  } else if (isString(value)) {
    return value === '';
  } else if (isNumber(value)) {
    return !isFinite(value);
  }
};

interface Props {
  contextId: string;
  eventId: string;
  processExecutable: string | undefined | null;
  processPid?: number | undefined | null;
  processName?: string | undefined | null;
}

export const ProcessDraggable = pure<Props>(
  ({ contextId, eventId, processExecutable, processName, processPid }) => {
    if (
      !isNillOrEmptyString(processName) ||
      (processName === '' &&
        isNillOrEmptyString(processExecutable) &&
        isNillOrEmptyString(processPid))
    ) {
      return (
        <DraggableBadge
          contextId={contextId}
          eventId={eventId}
          field="process.name"
          value={processName}
          iconType="console"
        />
      );
    } else if (
      !isNillOrEmptyString(processExecutable) ||
      (processExecutable === '' && isNillOrEmptyString(processPid))
    ) {
      return (
        <DraggableBadge
          contextId={contextId}
          eventId={eventId}
          field="process.executable"
          value={processExecutable}
          iconType="console"
        />
      );
    } else if (processPid != null) {
      return (
        <DraggableBadge
          contextId={contextId}
          eventId={eventId}
          field="process.pid"
          value={String(processPid)}
          iconType="number"
        />
      );
    } else {
      return null;
    }
  }
);

export const ProcessDraggableWithNonExistentProcess = pure<Props>(
  ({ contextId, eventId, processExecutable, processName, processPid }) => {
    if (processExecutable == null && processName == null && processPid == null) {
      return <>{i18n.NON_EXISTENT}</>;
    } else {
      return (
        <ProcessDraggable
          contextId={contextId}
          eventId={eventId}
          processExecutable={processExecutable}
          processName={processName}
          processPid={processPid}
        />
      );
    }
  }
);
