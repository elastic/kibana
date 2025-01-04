/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import classNames from 'classnames';
import React, { Fragment, ReactNode } from 'react';

import { EuiIcon, EuiLoadingSpinner } from '@elastic/eui';

import './_step_progress.scss';

type STATUS = 'incomplete' | 'inProgress' | 'complete' | 'failed' | 'paused' | 'cancelled';

const StepStatus: React.FunctionComponent<{ status: STATUS; idx: number }> = ({ status, idx }) => {
  if (status === 'incomplete') {
    return <span className="upgStepProgress__status">{idx + 1}.</span>;
  } else if (status === 'inProgress') {
    return <EuiLoadingSpinner size="m" className="upgStepProgress__status" />;
  } else if (status === 'complete') {
    return (
      <span className="upgStepProgress__status upgStepProgress__status--circle upgStepProgress__status--circle-complete">
        <EuiIcon type="check" size="s" />
      </span>
    );
  } else if (status === 'paused') {
    return (
      <span className="upgStepProgress__status upgStepProgress__status--circle upgStepProgress__status--circle-paused">
        <EuiIcon type="pause" size="s" />
      </span>
    );
  } else if (status === 'cancelled') {
    return (
      <span className="upgStepProgress__status upgStepProgress__status--circle upgStepProgress__status--circle-cancelled">
        <EuiIcon type="cross" size="s" />
      </span>
    );
  } else if (status === 'failed') {
    return (
      <span className="upgStepProgress__status upgStepProgress__status--circle upgStepProgress__status--circle-failed">
        <EuiIcon type="cross" size="s" />
      </span>
    );
  }

  throw new Error(`Unsupported status: ${status}`);
};

const Step: React.FunctionComponent<StepProgressStep & { idx: number }> = ({
  title,
  status,
  children,
  idx,
}) => {
  const titleClassName = classNames('upgStepProgress__title', {
    'upgStepProgress__title--currentStep': status === 'inProgress',
  });

  return (
    <Fragment>
      <div className="upgStepProgress__step">
        <StepStatus status={status} idx={idx} />
        <div className={titleClassName}>{title}</div>
      </div>
      {children && <div className="upgStepProgress__content">{children}</div>}
    </Fragment>
  );
};

export interface StepProgressStep {
  title: React.ReactNode;
  status: STATUS;
  children?: ReactNode;
}

/**
 * A generic component that displays a series of automated steps and the system's progress.
 */
export const StepProgress: React.FunctionComponent<{
  steps: StepProgressStep[];
}> = ({ steps }) => {
  return (
    <div className="upgStepProgress__container">
      {/* Use the index as the key only works here because these values do not change order after mounting. */}
      {steps.map((step, idx) => (
        <Step key={idx} {...step} idx={idx} />
      ))}
    </div>
  );
};
