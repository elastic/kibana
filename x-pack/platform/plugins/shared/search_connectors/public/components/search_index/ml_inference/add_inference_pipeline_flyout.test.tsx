/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiStepsHorizontal,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';

import {
  AddInferencePipelineFlyout,
  AddInferencePipelineContent,
  AddInferencePipelineHorizontalSteps,
  AddInferencePipelineFooter,
} from './add_inference_pipeline_flyout';
import { ConfigureFields } from './configure_fields';
import { ConfigurePipeline } from './configure_pipeline';
import { EMPTY_PIPELINE_CONFIGURATION } from './ml_inference_logic';
import { ReviewPipeline } from './review_pipeline';
import { TestPipeline } from './test_pipeline';
import { AddInferencePipelineSteps } from './types';

const supportedMLModels: TrainedModelConfigResponse[] = [
  {
    inference_config: {
      ner: {},
    },
    input: {
      field_names: [],
    },
    model_id: 'test_model_id',
    model_type: 'pytorch',
    tags: ['test_tag'],
    version: '1',
  },
];
const DEFAULT_VALUES = {
  addInferencePipelineModal: {
    configuration: { ...EMPTY_PIPELINE_CONFIGURATION },
    indexName: 'unit-test-index',
    simulateBody: '',
    step: AddInferencePipelineSteps.Configuration,
  },
  createErrors: [],
  indexName: 'unit-test-index',
  isLoading: false,
  isConfigureStepValid: true,
  isPipelineDataValid: true,
  supportedMLModels,
};
const onClose = jest.fn();

describe('AddInferencePipelineFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ ...DEFAULT_VALUES });
    setMockActions({
      setIndexName: jest.fn(),
    });
  });
  it('renders AddProcessorContent', () => {
    const wrapper = shallow(<AddInferencePipelineFlyout onClose={onClose} />);
    expect(wrapper.find(AddInferencePipelineContent)).toHaveLength(1);
  });
  describe('AddProcessorContent', () => {
    it('renders spinner when loading', () => {
      setMockValues({ ...DEFAULT_VALUES, isLoading: true });
      const wrapper = shallow(<AddInferencePipelineContent onClose={onClose} />);
      expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);
    });
    it('renders AddInferencePipelineHorizontalSteps', () => {
      const wrapper = shallow(<AddInferencePipelineContent onClose={onClose} />);
      expect(wrapper.find(AddInferencePipelineHorizontalSteps)).toHaveLength(1);
    });
    it('renders ModalFooter', () => {
      const wrapper = shallow(<AddInferencePipelineContent onClose={onClose} />);
      expect(wrapper.find(AddInferencePipelineFooter)).toHaveLength(1);
    });
    it('renders errors', () => {
      const errorMsg = 'oh no!';
      setMockValues({ ...DEFAULT_VALUES, createErrors: [errorMsg] });
      const wrapper = shallow(<AddInferencePipelineContent onClose={onClose} />);

      expect(wrapper.find(EuiCallOut)).toHaveLength(1);
      const errorCallout = wrapper.find(EuiCallOut);
      expect(errorCallout.prop('color')).toBe('danger');
      expect(errorCallout.prop('iconType')).toBe('error');
      expect(errorCallout.find('p')).toHaveLength(1);
      expect(errorCallout.find('p').text()).toBe(errorMsg);
    });
    it('renders configure step', () => {
      const wrapper = shallow(<AddInferencePipelineContent onClose={onClose} />);
      expect(wrapper.find(ConfigurePipeline)).toHaveLength(1);
    });
    it('renders fields step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          step: AddInferencePipelineSteps.Fields,
        },
      });
      const wrapper = shallow(<AddInferencePipelineContent onClose={onClose} />);
      expect(wrapper.find(ConfigureFields)).toHaveLength(1);
    });
    it('renders test step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          step: AddInferencePipelineSteps.Test,
        },
      });
      const wrapper = shallow(<AddInferencePipelineContent onClose={onClose} />);
      expect(wrapper.find(TestPipeline)).toHaveLength(1);
    });
    it('renders review step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          step: AddInferencePipelineSteps.Review,
        },
      });
      const wrapper = shallow(<AddInferencePipelineContent onClose={onClose} />);
      expect(wrapper.find(ReviewPipeline)).toHaveLength(1);
    });
  });
  describe('AddInferencePipelineHorizontalSteps', () => {
    const CONFIGURE_STEP_INDEX = 0;
    const FIELDS_STEP_INDEX = 1;
    const TEST_STEP_INDEX = 2;
    const REVIEW_STEP_INDEX = 3;
    const onAddInferencePipelineStepChange = jest.fn();
    beforeEach(() => {
      setMockActions({
        onAddInferencePipelineStepChange,
      });
    });
    it('renders EuiStepsHorizontal', () => {
      const wrapper = shallow(<AddInferencePipelineHorizontalSteps />);
      expect(wrapper.find(EuiStepsHorizontal)).toHaveLength(1);
    });

    const testStepStatus = (stepIndex: number, expectedTitle: string, expectedStatus: string) => {
      const wrapper = shallow(<AddInferencePipelineHorizontalSteps />);
      const steps = wrapper.find(EuiStepsHorizontal);
      const step = steps.prop('steps')[stepIndex];
      expect(step.title).toBe(expectedTitle);
      expect(step.status).toBe(expectedStatus);
    };

    it('configure step is current with valid data', () => {
      testStepStatus(CONFIGURE_STEP_INDEX, 'Configure', 'current');
    });
    it('configure step is current with invalid data', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        isConfigureStepValid: false,
      });
      testStepStatus(CONFIGURE_STEP_INDEX, 'Configure', 'current');
    });
    it('configure step is complete when on later step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          step: AddInferencePipelineSteps.Review,
        },
      });
      testStepStatus(CONFIGURE_STEP_INDEX, 'Configure', 'complete');
    });
    it('fields step is current with valid data', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          step: AddInferencePipelineSteps.Fields,
        },
      });
      testStepStatus(FIELDS_STEP_INDEX, 'Fields', 'current');
    });
    it('fields step is current with invalid data', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          step: AddInferencePipelineSteps.Fields,
        },
        isPipelineDataValid: false,
      });
      testStepStatus(FIELDS_STEP_INDEX, 'Fields', 'current');
    });
    it('fields step is complete when on later step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          step: AddInferencePipelineSteps.Review,
        },
      });
      testStepStatus(FIELDS_STEP_INDEX, 'Fields', 'complete');
    });
    it('test step is current when on step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          step: AddInferencePipelineSteps.Test,
        },
      });
      testStepStatus(TEST_STEP_INDEX, 'Test (Optional)', 'current');
    });
    it('test step is complete when on later step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          step: AddInferencePipelineSteps.Review,
        },
      });
      testStepStatus(TEST_STEP_INDEX, 'Test (Optional)', 'complete');
    });
    it('review step is current when on step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          step: AddInferencePipelineSteps.Review,
        },
      });
      testStepStatus(REVIEW_STEP_INDEX, 'Review', 'current');
    });

    const testClickStep = (
      stepIndex: number,
      expectedStepAfterClicking: AddInferencePipelineSteps
    ) => {
      const wrapper = shallow(<AddInferencePipelineHorizontalSteps />);
      const steps = wrapper.find(EuiStepsHorizontal);
      const stepToClick = steps.prop('steps')[stepIndex];
      stepToClick.onClick({} as any);
      expect(onAddInferencePipelineStepChange).toHaveBeenCalledWith(expectedStepAfterClicking);
    };

    it('clicking configure step updates step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          step: AddInferencePipelineSteps.Review,
        },
      });
      testClickStep(CONFIGURE_STEP_INDEX, AddInferencePipelineSteps.Configuration);
    });
    it('clicking fields step updates step', () => {
      testClickStep(FIELDS_STEP_INDEX, AddInferencePipelineSteps.Fields);
    });
    it('clicking test step updates step', () => {
      testClickStep(TEST_STEP_INDEX, AddInferencePipelineSteps.Test);
    });
    it('clicking review step updates step', () => {
      testClickStep(REVIEW_STEP_INDEX, AddInferencePipelineSteps.Review);
    });

    const testCannotClickInvalidStep = (stepIndex: number) => {
      const wrapper = shallow(<AddInferencePipelineHorizontalSteps />);
      const steps = wrapper.find(EuiStepsHorizontal);
      const stepToClick = steps.prop('steps')[stepIndex];
      stepToClick.onClick({} as any);
      expect(onAddInferencePipelineStepChange).not.toHaveBeenCalled();
    };

    it('cannot click fields step when data is invalid', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        isConfigureStepValid: false,
      });
      testCannotClickInvalidStep(FIELDS_STEP_INDEX);
    });
    it('cannot click test step when data is invalid', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        isPipelineDataValid: false,
      });
      testCannotClickInvalidStep(TEST_STEP_INDEX);
    });
    it('cannot click review step when data is invalid', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        isPipelineDataValid: false,
      });
      testCannotClickInvalidStep(REVIEW_STEP_INDEX);
    });
  });
  describe('ModalFooter', () => {
    const ingestionMethod = 'crawler';
    const actions = {
      attachPipeline: jest.fn(),
      createPipeline: jest.fn(),
      onAddInferencePipelineStepChange: jest.fn(),
    };
    beforeEach(() => {
      setMockActions(actions);
    });
    it('renders cancel button on config step', () => {
      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      const cancelBtn = wrapper.find(EuiButtonEmpty);
      expect(cancelBtn).toHaveLength(1);
      expect(cancelBtn.prop('children')).toBe('Cancel');
      cancelBtn.prop('onClick')!({} as any);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    it('renders cancel button on fields step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          ...DEFAULT_VALUES.addInferencePipelineModal,
          step: AddInferencePipelineSteps.Fields,
        },
      });
      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      expect(wrapper.find(EuiButtonEmpty)).toHaveLength(2);
      const cancelBtn = wrapper.find(EuiButtonEmpty).at(0);
      expect(cancelBtn.prop('children')).toBe('Cancel');
      cancelBtn.prop('onClick')!({} as any);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    it('renders cancel button on test step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          ...DEFAULT_VALUES.addInferencePipelineModal,
          step: AddInferencePipelineSteps.Test,
        },
      });
      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      expect(wrapper.find(EuiButtonEmpty)).toHaveLength(2);
      const cancelBtn = wrapper.find(EuiButtonEmpty).at(0);
      expect(cancelBtn.prop('children')).toBe('Cancel');
      cancelBtn.prop('onClick')!({} as any);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    it('renders cancel button on review step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          ...DEFAULT_VALUES.addInferencePipelineModal,
          step: AddInferencePipelineSteps.Review,
        },
      });
      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      expect(wrapper.find(EuiButtonEmpty)).toHaveLength(2);
      const cancelBtn = wrapper.find(EuiButtonEmpty).at(0);
      expect(cancelBtn.prop('children')).toBe('Cancel');
      cancelBtn.prop('onClick')!({} as any);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    const testBackButton = (
      currentStep: AddInferencePipelineSteps,
      expectedStepAfterPressingBackButton: AddInferencePipelineSteps
    ) => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          ...DEFAULT_VALUES.addInferencePipelineModal,
          step: currentStep,
        },
      });
      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      expect(wrapper.find(EuiButtonEmpty)).toHaveLength(2);
      const backBtn = wrapper.find(EuiButtonEmpty).at(1);
      expect(backBtn.prop('children')).toBe('Back');
      backBtn.prop('onClick')!({} as any);
      expect(actions.onAddInferencePipelineStepChange).toHaveBeenCalledWith(
        expectedStepAfterPressingBackButton
      );
    };

    it('renders back button on fields step', () => {
      testBackButton(AddInferencePipelineSteps.Fields, AddInferencePipelineSteps.Configuration);
    });
    it('renders back button on test step', () => {
      testBackButton(AddInferencePipelineSteps.Test, AddInferencePipelineSteps.Fields);
    });
    it('renders back button on review step', () => {
      testBackButton(AddInferencePipelineSteps.Review, AddInferencePipelineSteps.Test);
    });

    it('renders enabled continue button with valid data', () => {
      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      const contBtn = wrapper.find(EuiButton);
      expect(contBtn).toHaveLength(1);
      expect(contBtn.prop('children')).toBe('Continue');
      expect(contBtn.prop('disabled')).toBe(false);
      contBtn.prop('onClick')!({} as any);
      expect(actions.onAddInferencePipelineStepChange).toHaveBeenCalledWith(
        AddInferencePipelineSteps.Fields
      );
    });
    it('renders disabled continue button with invalid data', () => {
      setMockValues({ ...DEFAULT_VALUES, isConfigureStepValid: false });
      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      expect(wrapper.find(EuiButton)).toHaveLength(1);
      expect(wrapper.find(EuiButton).prop('children')).toBe('Continue');
      expect(wrapper.find(EuiButton).prop('disabled')).toBe(true);
    });
    it('renders continue button on fields step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          ...DEFAULT_VALUES.addInferencePipelineModal,
          step: AddInferencePipelineSteps.Fields,
        },
      });
      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      const contBtn = wrapper.find(EuiButton);
      expect(contBtn).toHaveLength(1);
      expect(contBtn.prop('children')).toBe('Continue');
      expect(contBtn.prop('disabled')).toBe(false);
      contBtn.prop('onClick')!({} as any);
      expect(actions.onAddInferencePipelineStepChange).toHaveBeenCalledWith(
        AddInferencePipelineSteps.Test
      );
    });
    it('renders continue button on test step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          ...DEFAULT_VALUES.addInferencePipelineModal,
          step: AddInferencePipelineSteps.Test,
        },
      });
      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      const contBtn = wrapper.find(EuiButton);
      expect(contBtn).toHaveLength(1);
      expect(contBtn.prop('children')).toBe('Continue');
      expect(contBtn.prop('disabled')).toBe(false);
      contBtn.prop('onClick')!({} as any);
      expect(actions.onAddInferencePipelineStepChange).toHaveBeenCalledWith(
        AddInferencePipelineSteps.Review
      );
    });
    it('renders create button on review step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          ...DEFAULT_VALUES.addInferencePipelineModal,
          step: AddInferencePipelineSteps.Review,
          configuration: {
            existingPipeline: false,
            modelID: 'test-model',
            pipelineName: 'my-test-pipeline',
          },
        },
      });

      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      const actionButton = wrapper.find(EuiButton);
      expect(actionButton).toHaveLength(1);
      expect(actionButton.prop('children')).toBe('Create pipeline');
      expect(actionButton.prop('color')).toBe('success');
      actionButton.prop('onClick')!({} as any);
      expect(actions.createPipeline).toHaveBeenCalledTimes(1);
    });
    it('renders attach button on review step', () => {
      setMockValues({
        ...DEFAULT_VALUES,
        addInferencePipelineModal: {
          ...DEFAULT_VALUES.addInferencePipelineModal,
          step: AddInferencePipelineSteps.Review,
          configuration: {
            existingPipeline: true,
            modelID: 'test-model',
            pipelineName: 'my-test-pipeline',
          },
        },
      });

      const wrapper = shallow(
        <AddInferencePipelineFooter ingestionMethod={ingestionMethod} onClose={onClose} />
      );
      const actionButton = wrapper.find(EuiButton);
      expect(actionButton).toHaveLength(1);
      expect(actionButton.prop('children')).toBe('Attach');
      expect(actionButton.prop('color')).toBe('primary');
      actionButton.prop('onClick')!({} as any);
      expect(actions.attachPipeline).toHaveBeenCalledTimes(1);
    });
  });
});
