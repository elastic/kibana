/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { IngestStreamLifecycleDSL } from '@kbn/streams-schema';
import { EditDslStepsFlyout } from './edit_dsl_steps_flyout';

const DATA_TEST_SUBJ = 'streamsEditDslStepsFlyout';

const tick = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
};

const getTab = (stepNumber: number) =>
  screen.getByTestId(`${DATA_TEST_SUBJ}Tab-step-${stepNumber}`);
const queryTab = (stepNumber: number) =>
  screen.queryByTestId(`${DATA_TEST_SUBJ}Tab-step-${stepNumber}`);
const getPanel = (stepIndex: number) =>
  screen.getByTestId(`${DATA_TEST_SUBJ}Panel-step-${stepIndex}`);
const withinStep = (stepIndex: number) => within(getPanel(stepIndex));

const renderFlyout = (
  props: Partial<React.ComponentProps<typeof EditDslStepsFlyout>> = {},
  options: { initialSelectedStepIndex?: number } = {}
) => {
  const onClose = jest.fn();
  const onChange = jest.fn();
  const onSave = jest.fn();

  const initialSteps: IngestStreamLifecycleDSL =
    props.initialSteps ??
    ({
      dsl: {
        data_retention: '30d',
      },
    } as IngestStreamLifecycleDSL);

  const setSelectedStepIndexRef: { current: ((index: number | undefined) => void) | null } = {
    current: null,
  };
  const onSelectedStepIndexChange = jest.fn();

  render(
    <Wrapper
      initialSteps={initialSteps}
      onClose={onClose}
      onChange={onChange}
      onSave={onSave}
      setSelectedStepIndexRef={setSelectedStepIndexRef}
      onSelectedStepIndexChange={onSelectedStepIndexChange}
      initialSelectedStepIndex={options.initialSelectedStepIndex}
      {...props}
    />
  );

  return {
    onClose,
    onChange,
    onSave,
    initialSteps,
    onSelectedStepIndexChange,
    setSelectedStepIndex: (index: number | undefined) => {
      act(() => {
        if (!setSelectedStepIndexRef.current) {
          throw new Error('selected step index setter not initialized');
        }
        setSelectedStepIndexRef.current(index);
      });
    },
  };
};

const Wrapper = ({
  initialSteps,
  initialSelectedStepIndex,
  onClose,
  onChange,
  onSave,
  setSelectedStepIndexRef,
  onSelectedStepIndexChange,
  ...props
}: Partial<React.ComponentProps<typeof EditDslStepsFlyout>> & {
  initialSteps: IngestStreamLifecycleDSL;
  initialSelectedStepIndex?: number;
  onClose: () => void;
  onChange: (next: IngestStreamLifecycleDSL) => void;
  onSave: (next: IngestStreamLifecycleDSL) => void;
  setSelectedStepIndexRef: { current: ((index: number | undefined) => void) | null };
  onSelectedStepIndexChange: jest.Mock;
}) => {
  const [selectedStepIndex, setSelectedStepIndex] = React.useState<number | undefined>(
    initialSelectedStepIndex
  );

  const setSelectedStepIndexProxy = (index: number | undefined) => {
    onSelectedStepIndexChange(index);
    setSelectedStepIndex(index);
  };
  setSelectedStepIndexRef.current = setSelectedStepIndexProxy;

  return (
    <>
      <div data-test-subj="selectedStepIndexValue">{selectedStepIndex ?? ''}</div>
      <EditDslStepsFlyout
        initialSteps={initialSteps}
        selectedStepIndex={selectedStepIndex}
        setSelectedStepIndex={setSelectedStepIndexProxy}
        onClose={onClose}
        onChange={onChange}
        onSave={onSave}
        {...props}
      />
    </>
  );
};

describe('EditDslStepsFlyout', () => {
  describe('rendering and tabs', () => {
    it('renders tabs for configured steps and selects the first step', async () => {
      renderFlyout({
        initialSteps: {
          dsl: {
            data_retention: '30d',
            downsample: [
              { after: '30d', fixed_interval: '1h' },
              { after: '40d', fixed_interval: '5d' },
            ],
          },
        },
      });

      await tick();

      expect(getTab(1)).toBeInTheDocument();
      expect(getTab(2)).toBeInTheDocument();
      expect(queryTab(3)).not.toBeInTheDocument();

      await waitFor(() =>
        expect(screen.getByTestId('selectedStepIndexValue')).toHaveTextContent('0')
      );
      expect(getPanel(0)).toBeVisible();
      expect(getPanel(1)).not.toBeVisible();

      fireEvent.click(getTab(2));
      await waitFor(() =>
        expect(screen.getByTestId('selectedStepIndexValue')).toHaveTextContent('1')
      );
      expect(getPanel(1)).toBeVisible();
      expect(getPanel(0)).not.toBeVisible();
    });

    it('can add a new step and selects it (no jump back to step 1)', async () => {
      renderFlyout({
        initialSteps: {
          dsl: {
            data_retention: '30d',
            downsample: [{ after: '30d', fixed_interval: '1h' }],
          },
        },
      });

      await tick();

      expect(queryTab(2)).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}AddTabButton`));

      await waitFor(() => expect(getTab(2)).toBeInTheDocument());
      await waitFor(() =>
        expect(screen.getByTestId('selectedStepIndexValue')).toHaveTextContent('1')
      );
      expect(getPanel(1)).toBeVisible();
    });

    it('creates and selects a missing step when selected externally', async () => {
      const { setSelectedStepIndex } = renderFlyout({
        initialSteps: {
          dsl: {
            data_retention: '30d',
            downsample: [{ after: '30d', fixed_interval: '1h' }],
          },
        },
      });

      await tick();
      expect(queryTab(3)).not.toBeInTheDocument();

      setSelectedStepIndex(2);

      await waitFor(() => expect(getTab(3)).toBeInTheDocument());
      expect(getPanel(2)).toBeVisible();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no steps and can add the first step', async () => {
      renderFlyout({
        initialSteps: {
          dsl: {
            data_retention: '30d',
          },
        },
      });

      await tick();

      expect(queryTab(1)).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}EmptyStateAddStepButton`));

      await waitFor(() => expect(getTab(1)).toBeInTheDocument());
      await waitFor(() =>
        expect(screen.getByTestId('selectedStepIndexValue')).toHaveTextContent('0')
      );
      expect(getPanel(0)).toBeVisible();
    });
  });

  describe('save and cancel', () => {
    it('calls onSave with the current serialized lifecycle when valid', async () => {
      type LifecycleWithPreservedFields = IngestStreamLifecycleDSL & {
        dsl: IngestStreamLifecycleDSL['dsl'] & {
          enabled?: boolean;
          downsampling_method?: string;
        };
      };
      const { onSave, initialSteps } = renderFlyout({
        initialSteps: {
          dsl: {
            data_retention: '30d',
            enabled: true,
            downsampling_method: 'something',
            downsample: [
              { after: '30d', fixed_interval: '1h' },
              { after: '40d', fixed_interval: '5d' },
            ],
          },
        } as LifecycleWithPreservedFields,
      });

      await tick();
      fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}SaveButton`));

      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
      expect(onSave).toHaveBeenCalledWith(initialSteps);
    });

    it('prevents saving when fixed_interval is not an integer', async () => {
      const { onSave } = renderFlyout({
        initialSteps: {
          dsl: {
            data_retention: '30d',
            downsample: [{ after: '30d', fixed_interval: '1h' }],
          },
        },
      });

      await tick();

      const panel = withinStep(0);
      fireEvent.change(panel.getByTestId(`${DATA_TEST_SUBJ}FixedIntervalValue`), {
        target: { value: '1.5' },
      });

      fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}SaveButton`));

      await tick();
      expect(onSave).toHaveBeenCalledTimes(0);
      // Inline error text is debounced by the form lib (isChangingValue), so assert the tab-level
      // error indicator which updates immediately via onError().
      expect(getTab(1).querySelector('[data-euiicon-type="warning"]')).not.toBeNull();
    });

    it('prevents saving when fixed_interval is less than 5 minutes', async () => {
      const { onSave } = renderFlyout({
        initialSteps: {
          dsl: {
            data_retention: '30d',
            downsample: [{ after: '30d', fixed_interval: '1h' }],
          },
        },
      });

      await tick();

      const panel = withinStep(0);
      fireEvent.change(panel.getByTestId(`${DATA_TEST_SUBJ}FixedIntervalUnit`), {
        target: { value: 'm' },
      });
      fireEvent.change(panel.getByTestId(`${DATA_TEST_SUBJ}FixedIntervalValue`), {
        target: { value: '1' },
      });

      fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}SaveButton`));

      await tick();
      expect(onSave).toHaveBeenCalledTimes(0);
      expect(getTab(1).querySelector('[data-euiicon-type="warning"]')).not.toBeNull();
    });

    it('calls onClose when cancelling', async () => {
      const { onClose } = renderFlyout();
      await tick();

      fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}CancelButton`));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('add/remove and defaults', () => {
    it('defaults new step values based on previous step', async () => {
      renderFlyout({
        initialSteps: {
          dsl: {
            data_retention: '30d',
            downsample: [
              { after: '10d', fixed_interval: '1h' },
              { after: '11d', fixed_interval: '2h' },
            ],
          },
        },
      });

      await tick();
      fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}AddTabButton`));

      await waitFor(() => expect(getTab(3)).toBeInTheDocument());
      expect(getPanel(2)).toBeVisible();

      const panel = withinStep(2);
      expect(panel.getByTestId(`${DATA_TEST_SUBJ}AfterValue`)).toHaveValue(22);
      expect(panel.getByTestId(`${DATA_TEST_SUBJ}AfterUnit`)).toHaveValue('d');
      expect(panel.getByTestId(`${DATA_TEST_SUBJ}FixedIntervalValue`)).toHaveValue(4);
      expect(panel.getByTestId(`${DATA_TEST_SUBJ}FixedIntervalUnit`)).toHaveValue('h');
    });

    it('renumbers (shifts) steps when a step is removed and keeps selection in sync', async () => {
      renderFlyout(
        {
          initialSteps: {
            dsl: {
              data_retention: '30d',
              downsample: [
                { after: '10d', fixed_interval: '1h' },
                { after: '20d', fixed_interval: '2h' },
                { after: '30d', fixed_interval: '3h' },
              ],
            },
          },
        },
        { initialSelectedStepIndex: 1 }
      );

      await tick();
      expect(getPanel(1)).toBeVisible();

      fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}RemoveStepButton-step-2`));

      await waitFor(() => expect(queryTab(3)).not.toBeInTheDocument());
      expect(getTab(2)).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByTestId('selectedStepIndexValue')).toHaveTextContent('1')
      );
      expect(getPanel(1)).toBeVisible();
    });

    it('preserves shifted values when removing a middle step', async () => {
      renderFlyout(
        {
          initialSteps: {
            dsl: {
              data_retention: '30d',
              downsample: [
                { after: '10d', fixed_interval: '1h' },
                { after: '20d', fixed_interval: '2h' },
                { after: '30d', fixed_interval: '3h' },
              ],
            },
          },
        },
        { initialSelectedStepIndex: 0 }
      );

      await tick();

      // Remove step 2 (index 1). Step 3 should shift into step 2 (index 1).
      fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}RemoveStepButton-step-2`));

      await waitFor(() => expect(queryTab(3)).not.toBeInTheDocument());
      fireEvent.click(getTab(2));

      const panel = withinStep(1);
      expect(panel.getByTestId(`${DATA_TEST_SUBJ}AfterValue`)).toHaveValue(30);
      expect(panel.getByTestId(`${DATA_TEST_SUBJ}AfterUnit`)).toHaveValue('d');
      expect(panel.getByTestId(`${DATA_TEST_SUBJ}FixedIntervalValue`)).toHaveValue(3);
      expect(panel.getByTestId(`${DATA_TEST_SUBJ}FixedIntervalUnit`)).toHaveValue('h');
    });
  });

  describe('onChange emission', () => {
    it('coalesces rapid internal updates and only emits the latest value when adding a step', async () => {
      const onChange = jest.fn();
      renderFlyout({
        initialSteps: {
          dsl: {
            data_retention: '30d',
            downsample: [
              { after: '40d', fixed_interval: '5d' },
              { after: '41d', fixed_interval: '10d' },
            ],
          },
        },
        onChange,
      });

      await tick();
      onChange.mockClear();

      fireEvent.click(screen.getByTestId(`${DATA_TEST_SUBJ}AddTabButton`));
      // Flush the coalesced emission.
      await tick();
      await tick();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenLastCalledWith({
        dsl: {
          data_retention: '30d',
          downsample: [
            { after: '40d', fixed_interval: '5d' },
            { after: '41d', fixed_interval: '10d' },
            { after: '82d', fixed_interval: '20d' },
          ],
        },
      });
    });
  });
});
