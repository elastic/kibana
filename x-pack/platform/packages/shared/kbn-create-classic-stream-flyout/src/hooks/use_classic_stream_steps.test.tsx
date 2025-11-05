/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useClassicStreamSteps, ClassicStreamStep } from './use_classic_stream_steps';

describe('useClassicStreamSteps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default step', () => {
      const { result } = renderHook(() => useClassicStreamSteps());

      expect(result.current.currentStep).toBe(ClassicStreamStep.SELECT_TEMPLATE);
      expect(result.current.hasNextStep).toBe(true);
      expect(result.current.hasPreviousStep).toBe(false);
    });

    it('should initialize with custom initial step', () => {
      const { result } = renderHook(() =>
        useClassicStreamSteps({ initialStep: ClassicStreamStep.NAME_AND_CONFIRM })
      );

      expect(result.current.currentStep).toBe(ClassicStreamStep.NAME_AND_CONFIRM);
      expect(result.current.hasNextStep).toBe(false);
      expect(result.current.hasPreviousStep).toBe(true);
    });

    it('should initialize with validation defaults set to true', () => {
      const { result } = renderHook(() => useClassicStreamSteps());

      expect(result.current.stepValidation.isSelectTemplateValid).toBe(true);
      expect(result.current.stepValidation.isNameAndConfirmValid).toBe(true);
    });
  });

  describe('step navigation', () => {
    it('should navigate to next step', () => {
      const { result } = renderHook(() => useClassicStreamSteps());

      expect(result.current.currentStep).toBe(ClassicStreamStep.SELECT_TEMPLATE);

      act(() => {
        result.current.goToNextStep();
      });

      expect(result.current.currentStep).toBe(ClassicStreamStep.NAME_AND_CONFIRM);
      expect(result.current.hasNextStep).toBe(false);
      expect(result.current.hasPreviousStep).toBe(true);
    });

    it('should not navigate beyond last step', () => {
      const { result } = renderHook(() =>
        useClassicStreamSteps({ initialStep: ClassicStreamStep.NAME_AND_CONFIRM })
      );

      expect(result.current.currentStep).toBe(ClassicStreamStep.NAME_AND_CONFIRM);

      act(() => {
        result.current.goToNextStep();
      });

      // Should remain on the same step
      expect(result.current.currentStep).toBe(ClassicStreamStep.NAME_AND_CONFIRM);
    });

    it('should navigate to previous step', () => {
      const { result } = renderHook(() =>
        useClassicStreamSteps({ initialStep: ClassicStreamStep.NAME_AND_CONFIRM })
      );

      expect(result.current.currentStep).toBe(ClassicStreamStep.NAME_AND_CONFIRM);

      act(() => {
        result.current.goToPreviousStep();
      });

      expect(result.current.currentStep).toBe(ClassicStreamStep.SELECT_TEMPLATE);
      expect(result.current.hasNextStep).toBe(true);
      expect(result.current.hasPreviousStep).toBe(false);
    });

    it('should not navigate before first step', () => {
      const { result } = renderHook(() => useClassicStreamSteps());

      expect(result.current.currentStep).toBe(ClassicStreamStep.SELECT_TEMPLATE);

      act(() => {
        result.current.goToPreviousStep();
      });

      // Should remain on the same step
      expect(result.current.currentStep).toBe(ClassicStreamStep.SELECT_TEMPLATE);
    });

    it('should jump to specific step', () => {
      const { result } = renderHook(() => useClassicStreamSteps());

      expect(result.current.currentStep).toBe(ClassicStreamStep.SELECT_TEMPLATE);

      act(() => {
        result.current.jumpToStep(ClassicStreamStep.NAME_AND_CONFIRM);
      });

      expect(result.current.currentStep).toBe(ClassicStreamStep.NAME_AND_CONFIRM);
    });
  });

  describe('onStepChange callback', () => {
    it('should call onStepChange when navigating forward', () => {
      const onStepChange = jest.fn();
      const { result } = renderHook(() => useClassicStreamSteps({ onStepChange }));

      act(() => {
        result.current.goToNextStep();
      });

      expect(onStepChange).toHaveBeenCalledWith(ClassicStreamStep.NAME_AND_CONFIRM);
      expect(onStepChange).toHaveBeenCalledTimes(1);
    });

    it('should call onStepChange when navigating backward', () => {
      const onStepChange = jest.fn();
      const { result } = renderHook(() =>
        useClassicStreamSteps({
          initialStep: ClassicStreamStep.NAME_AND_CONFIRM,
          onStepChange,
        })
      );

      act(() => {
        result.current.goToPreviousStep();
      });

      expect(onStepChange).toHaveBeenCalledWith(ClassicStreamStep.SELECT_TEMPLATE);
      expect(onStepChange).toHaveBeenCalledTimes(1);
    });

    it('should call onStepChange when jumping to step', () => {
      const onStepChange = jest.fn();
      const { result } = renderHook(() => useClassicStreamSteps({ onStepChange }));

      act(() => {
        result.current.jumpToStep(ClassicStreamStep.NAME_AND_CONFIRM);
      });

      expect(onStepChange).toHaveBeenCalledWith(ClassicStreamStep.NAME_AND_CONFIRM);
      expect(onStepChange).toHaveBeenCalledTimes(1);
    });

    it('should not call onStepChange when trying to navigate beyond boundaries', () => {
      const onStepChange = jest.fn();
      const { result } = renderHook(() => useClassicStreamSteps({ onStepChange }));

      act(() => {
        result.current.goToPreviousStep(); // Already at first step
      });

      expect(onStepChange).not.toHaveBeenCalled();
    });
  });

  describe('validation state management', () => {
    it('should update validation state for select template step', () => {
      const { result } = renderHook(() => useClassicStreamSteps());

      expect(result.current.stepValidation.isSelectTemplateValid).toBe(true);

      act(() => {
        result.current.setStepValidation({ isSelectTemplateValid: false });
      });

      expect(result.current.stepValidation.isSelectTemplateValid).toBe(false);
      expect(result.current.stepValidation.isNameAndConfirmValid).toBe(true);
    });

    it('should update validation state for name and confirm step', () => {
      const { result } = renderHook(() => useClassicStreamSteps());

      expect(result.current.stepValidation.isNameAndConfirmValid).toBe(true);

      act(() => {
        result.current.setStepValidation({ isNameAndConfirmValid: false });
      });

      expect(result.current.stepValidation.isSelectTemplateValid).toBe(true);
      expect(result.current.stepValidation.isNameAndConfirmValid).toBe(false);
    });

    it('should update multiple validation states at once', () => {
      const { result } = renderHook(() => useClassicStreamSteps());

      act(() => {
        result.current.setStepValidation({
          isSelectTemplateValid: false,
          isNameAndConfirmValid: false,
        });
      });

      expect(result.current.stepValidation.isSelectTemplateValid).toBe(false);
      expect(result.current.stepValidation.isNameAndConfirmValid).toBe(false);
    });

    it('should partially update validation state', () => {
      const { result } = renderHook(() => useClassicStreamSteps());

      act(() => {
        result.current.setStepValidation({ isSelectTemplateValid: false });
      });

      expect(result.current.stepValidation.isSelectTemplateValid).toBe(false);
      expect(result.current.stepValidation.isNameAndConfirmValid).toBe(true);

      act(() => {
        result.current.setStepValidation({ isSelectTemplateValid: true });
      });

      expect(result.current.stepValidation.isSelectTemplateValid).toBe(true);
      expect(result.current.stepValidation.isNameAndConfirmValid).toBe(true);
    });
  });

  describe('button state logic', () => {
    describe('next button', () => {
      it('should enable next button when first step is valid', () => {
        const { result } = renderHook(() => useClassicStreamSteps());

        expect(result.current.currentStep).toBe(ClassicStreamStep.SELECT_TEMPLATE);
        expect(result.current.isNextButtonEnabled).toBe(true);
      });

      it('should disable next button when first step is invalid', () => {
        const { result } = renderHook(() => useClassicStreamSteps());

        act(() => {
          result.current.setStepValidation({ isSelectTemplateValid: false });
        });

        expect(result.current.isNextButtonEnabled).toBe(false);
      });

      it('should enable next button on second step when valid', () => {
        const { result } = renderHook(() =>
          useClassicStreamSteps({ initialStep: ClassicStreamStep.NAME_AND_CONFIRM })
        );

        expect(result.current.isNextButtonEnabled).toBe(true);
      });

      it('should disable next button on second step when invalid', () => {
        const { result } = renderHook(() =>
          useClassicStreamSteps({ initialStep: ClassicStreamStep.NAME_AND_CONFIRM })
        );

        act(() => {
          result.current.setStepValidation({ isNameAndConfirmValid: false });
        });

        expect(result.current.isNextButtonEnabled).toBe(false);
      });
    });

    describe('create button', () => {
      it('should enable create button on final step when valid', () => {
        const { result } = renderHook(() =>
          useClassicStreamSteps({ initialStep: ClassicStreamStep.NAME_AND_CONFIRM })
        );

        expect(result.current.isCreateButtonEnabled).toBe(true);
      });

      it('should disable create button on final step when invalid', () => {
        const { result } = renderHook(() =>
          useClassicStreamSteps({ initialStep: ClassicStreamStep.NAME_AND_CONFIRM })
        );

        act(() => {
          result.current.setStepValidation({ isNameAndConfirmValid: false });
        });

        expect(result.current.isCreateButtonEnabled).toBe(false);
      });

      it('should disable create button when not on final step', () => {
        const { result } = renderHook(() => useClassicStreamSteps());

        expect(result.current.currentStep).toBe(ClassicStreamStep.SELECT_TEMPLATE);
        expect(result.current.isCreateButtonEnabled).toBe(false);
      });
    });
  });

  describe('step status', () => {
    it('should mark first step as current initially', () => {
      const { result } = renderHook(() => useClassicStreamSteps());

      const steps = result.current.steps;
      expect(steps[0].status).toBe('current');
      expect(steps[1].status).toBe('incomplete');
    });

    it('should mark second step as current when navigated to', () => {
      const { result } = renderHook(() => useClassicStreamSteps());

      act(() => {
        result.current.goToNextStep();
      });

      const steps = result.current.steps;
      expect(steps[0].status).toBe('complete');
      expect(steps[1].status).toBe('current');
    });

    it('should update step status when jumping between steps', () => {
      const { result } = renderHook(() => useClassicStreamSteps());

      act(() => {
        result.current.jumpToStep(ClassicStreamStep.NAME_AND_CONFIRM);
      });

      let steps = result.current.steps;
      expect(steps[0].status).toBe('complete');
      expect(steps[1].status).toBe('current');

      act(() => {
        result.current.jumpToStep(ClassicStreamStep.SELECT_TEMPLATE);
      });

      steps = result.current.steps;
      expect(steps[0].status).toBe('current');
      expect(steps[1].status).toBe('incomplete');
    });
  });

  describe('steps configuration', () => {
    it('should have correct number of steps', () => {
      const { result } = renderHook(() => useClassicStreamSteps());

      expect(result.current.steps).toHaveLength(2);
    });

    it('should have correct step titles', () => {
      const { result } = renderHook(() => useClassicStreamSteps());

      expect(result.current.steps[0].title).toBe('Select template');
      expect(result.current.steps[1].title).toBe('Name and confirm');
    });

    it('should have correct test subjects', () => {
      const { result } = renderHook(() => useClassicStreamSteps());

      expect(result.current.steps[0]['data-test-subj']).toBe(
        'createClassicStreamStep-selectTemplate'
      );
      expect(result.current.steps[1]['data-test-subj']).toBe(
        'createClassicStreamStep-nameAndConfirm'
      );
    });

    it('should have onClick handlers for each step', () => {
      const { result } = renderHook(() => useClassicStreamSteps());

      expect(result.current.steps[0].onClick).toBeDefined();
      expect(result.current.steps[1].onClick).toBeDefined();
      expect(typeof result.current.steps[0].onClick).toBe('function');
      expect(typeof result.current.steps[1].onClick).toBe('function');
    });

    it('should navigate when clicking step onClick handlers', () => {
      const { result } = renderHook(() => useClassicStreamSteps());

      expect(result.current.currentStep).toBe(ClassicStreamStep.SELECT_TEMPLATE);

      act(() => {
        result.current.steps[1].onClick?.({} as any);
      });

      expect(result.current.currentStep).toBe(ClassicStreamStep.NAME_AND_CONFIRM);

      act(() => {
        result.current.steps[0].onClick?.({} as any);
      });

      expect(result.current.currentStep).toBe(ClassicStreamStep.SELECT_TEMPLATE);
    });
  });
});
