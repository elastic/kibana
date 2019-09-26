/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { IndexGroup, ReindexStatus, ReindexStep } from '../../../../../../../common/types';
import { ReindexState } from '../polling_service';
import { ReindexProgress } from './progress';

describe('ReindexProgress', () => {
  it('renders', () => {
    const wrapper = shallow(
      <ReindexProgress
        reindexState={
          {
            lastCompletedStep: ReindexStep.created,
            status: ReindexStatus.inProgress,
            reindexTaskPercComplete: null,
            errorMessage: null,
          } as ReindexState
        }
        cancelReindex={jest.fn()}
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
<StepProgress
  steps={
    Array [
      Object {
        "status": "incomplete",
        "title": <FormattedMessage
          defaultMessage="Setting old index to read-only"
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.readonlyStepTitle"
          values={Object {}}
        />,
      },
      Object {
        "status": "incomplete",
        "title": <FormattedMessage
          defaultMessage="Creating new index"
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.createIndexStepTitle"
          values={Object {}}
        />,
      },
      Object {
        "status": "incomplete",
        "title": <FormattedMessage
          defaultMessage="Reindexing documents"
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.reindexingDocumentsStepTitle"
          values={Object {}}
        />,
      },
      Object {
        "status": "incomplete",
        "title": <FormattedMessage
          defaultMessage="Swapping original index with alias"
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.aliasSwapStepTitle"
          values={Object {}}
        />,
      },
    ]
  }
/>
`);
  });

  it('displays errors in the step that failed', () => {
    const wrapper = shallow(
      <ReindexProgress
        reindexState={
          {
            lastCompletedStep: ReindexStep.reindexCompleted,
            status: ReindexStatus.failed,
            reindexTaskPercComplete: 1,
            errorMessage: `This is an error that happened on alias switch`,
          } as ReindexState
        }
        cancelReindex={jest.fn()}
      />
    );

    const aliasStep = wrapper.props().steps[3];
    expect(aliasStep.children.props.errorMessage).toEqual(
      `This is an error that happened on alias switch`
    );
  });

  it('shows reindexing document progress bar', () => {
    const wrapper = shallow(
      <ReindexProgress
        reindexState={
          {
            lastCompletedStep: ReindexStep.reindexStarted,
            status: ReindexStatus.inProgress,
            reindexTaskPercComplete: 0.25,
            errorMessage: null,
          } as ReindexState
        }
        cancelReindex={jest.fn()}
      />
    );

    const reindexStep = wrapper.props().steps[2];
    expect(reindexStep.children.type.name).toEqual('ReindexProgressBar');
    expect(reindexStep.children.props.reindexState.reindexTaskPercComplete).toEqual(0.25);
  });

  it('adds steps for index groups', () => {
    const wrapper = shallow(
      <ReindexProgress
        reindexState={
          {
            lastCompletedStep: ReindexStep.created,
            status: ReindexStatus.inProgress,
            indexGroup: IndexGroup.ml,
            reindexTaskPercComplete: null,
            errorMessage: null,
          } as ReindexState
        }
        cancelReindex={jest.fn()}
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
<StepProgress
  steps={
    Array [
      Object {
        "status": "inProgress",
        "title": <FormattedMessage
          defaultMessage="Pausing Machine Learning jobs"
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.pauseMlStepTitle"
          values={Object {}}
        />,
      },
      Object {
        "status": "incomplete",
        "title": <FormattedMessage
          defaultMessage="Setting old index to read-only"
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.readonlyStepTitle"
          values={Object {}}
        />,
      },
      Object {
        "status": "incomplete",
        "title": <FormattedMessage
          defaultMessage="Creating new index"
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.createIndexStepTitle"
          values={Object {}}
        />,
      },
      Object {
        "status": "incomplete",
        "title": <FormattedMessage
          defaultMessage="Reindexing documents"
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.reindexingDocumentsStepTitle"
          values={Object {}}
        />,
      },
      Object {
        "status": "incomplete",
        "title": <FormattedMessage
          defaultMessage="Swapping original index with alias"
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.aliasSwapStepTitle"
          values={Object {}}
        />,
      },
      Object {
        "status": "incomplete",
        "title": <FormattedMessage
          defaultMessage="Resuming Machine Learning jobs"
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.resumeMlStepTitle"
          values={Object {}}
        />,
      },
    ]
  }
/>
`);
  });
});
