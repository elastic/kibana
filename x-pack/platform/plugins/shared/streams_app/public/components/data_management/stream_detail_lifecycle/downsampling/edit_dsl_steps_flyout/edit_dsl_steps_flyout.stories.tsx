/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React, { useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { IngestStreamLifecycleDSL } from '@kbn/streams-schema';
import { EditDslStepsFlyout } from './edit_dsl_steps_flyout';
import { MAX_DOWNSAMPLE_STEPS } from './form';

const meta: Meta<typeof EditDslStepsFlyout> = {
  component: EditDslStepsFlyout,
  title: 'streams/EditDslStepsFlyout',
};

export default meta;
type Story = StoryObj<typeof EditDslStepsFlyout>;

export const Default: Story = {
  render: () => {
    const StoryComponent = () => {
      const initialSteps: IngestStreamLifecycleDSL = {
        dsl: {
          data_retention: '30d',
          downsample: [
            {
              after: '30d',
              fixed_interval: '1h',
            },
            {
              after: '40d',
              fixed_interval: '5d',
            },
          ],
        },
      };

      const [selectedStepIndex, setSelectedStepIndex] = useState<number | undefined>(undefined);

      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EditDslStepsFlyout
              initialSteps={initialSteps}
              selectedStepIndex={selectedStepIndex}
              setSelectedStepIndex={setSelectedStepIndex}
              onClose={() => {
                action('onClose')();
              }}
              onChange={(next: IngestStreamLifecycleDSL) => {
                action('onChange')(next);
              }}
              onSave={(next: IngestStreamLifecycleDSL) => {
                action('onSave')(next);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };
    return <StoryComponent />;
  },
};

export const PreserveMsUnits: Story = {
  render: () => {
    const StoryComponent = () => {
      const initialSteps: IngestStreamLifecycleDSL = {
        dsl: {
          data_retention: '30d',
          downsample: [{ after: '1500ms', fixed_interval: '300000ms' }],
        },
      };

      const [selectedStepIndex, setSelectedStepIndex] = useState<number | undefined>(0);

      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EditDslStepsFlyout
              initialSteps={initialSteps}
              selectedStepIndex={selectedStepIndex}
              setSelectedStepIndex={setSelectedStepIndex}
              onClose={() => {
                action('onClose')();
              }}
              onChange={(next: IngestStreamLifecycleDSL) => {
                action('onChange')(next);
              }}
              onSave={(next: IngestStreamLifecycleDSL) => {
                action('onSave')(next);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };

    return <StoryComponent />;
  },
};

export const StepSyncing: Story = {
  render: () => {
    const StoryComponent = () => {
      const [isOpen, setIsOpen] = useState(false);
      const [steps, setSteps] = useState<IngestStreamLifecycleDSL>({
        dsl: {
          data_retention: '30d',
          downsample: [
            { after: '30d', fixed_interval: '1h' },
            { after: '40d', fixed_interval: '5d' },
          ],
        },
      });
      const [selectedStepIndex, setSelectedStepIndex] = useState<number | undefined>(0);

      const currentStepsCount = steps.dsl?.downsample?.length ?? 0;
      const canAddMore = currentStepsCount < MAX_DOWNSAMPLE_STEPS;

      const openAtIndex = (index: number) => {
        setSelectedStepIndex(index);
        setIsOpen(true);
      };

      const addStepOutsideAndOpen = () => {
        openAtIndex(currentStepsCount);
      };

      return (
        <EuiFlexGroup direction="column" gutterSize="m" style={{ maxWidth: 560 }}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" wrap responsive={false}>
              {Array.from({ length: currentStepsCount }, (_, index) => (
                <EuiFlexItem key={index} grow={false}>
                  <EuiButton size="s" onClick={() => openAtIndex(index)}>
                    Step {index + 1}
                  </EuiButton>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton size="s" onClick={addStepOutsideAndOpen} disabled={!canAddMore}>
              Add downsample step
            </EuiButton>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiSpacer size="s" />
            {isOpen ? (
              <EditDslStepsFlyout
                initialSteps={steps}
                selectedStepIndex={selectedStepIndex}
                setSelectedStepIndex={setSelectedStepIndex}
                onClose={() => {
                  action('onClose')();
                  setIsOpen(false);
                }}
                onChange={(next: IngestStreamLifecycleDSL) => {
                  action('onChange')(next);
                  setSteps(next);
                }}
                onSave={(next: IngestStreamLifecycleDSL) => {
                  action('onSave')(next);
                  setSteps(next);
                  setIsOpen(false);
                }}
              />
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };

    return <StoryComponent />;
  },
};
