/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as Rx from 'rxjs';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiPortal,
  useEuiTheme,
  EuiTitle,
  EuiTourStepIndicator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiForm,
  EuiButtonIcon,
} from '@elastic/eui';
import type { HttpStart } from '@kbn/core-http-browser';
import type { EuiTourStepStatus } from '@elastic/eui/src/components/tour/tour_step_indicator';
import type { InterceptDialogApi, InterceptSteps } from '../../service/intercept_dialog_api';
import { styles as interceptDisplayManagerStyles } from './intercept_display_manager.styles';

export type Intercept = Rx.ObservedValueOf<ReturnType<InterceptDialogApi['get$']>>[number];

export type InterceptApiAckProps = Parameters<InterceptDialogApi['ack']>[0];

interface InterceptDialogManagerProps {
  ackIntercept: (args: InterceptApiAckProps & Pick<Intercept, 'runId'>) => void;
  /**
   * Observable that emits the intercept to be displayed
   */
  intercept$: Rx.Observable<Intercept>;
  /**
   * Helper to load static assets pertinent to the intercept plugin
   */
  staticAssetsHelper: HttpStart['staticAssets'];
}

interface InterceptProgressIndicatorProps {
  stepsTotal: number;
  currentStep: number;
}

const InterceptProgressIndicator = React.memo(
  ({ stepsTotal, currentStep }: InterceptProgressIndicatorProps) => {
    if (!stepsTotal) return null;

    return (
      <EuiFlexItem grow={false}>
        <ul className="euiTourFooter__stepList">
          {[...Array(stepsTotal).keys()].map((_, i) => {
            let status: EuiTourStepStatus = 'complete';
            if (currentStep === i) {
              status = 'active';
            } else if (currentStep <= i) {
              status = 'incomplete';
            }
            return <EuiTourStepIndicator key={i} number={i + 1} status={status} />;
          })}
        </ul>
      </EuiFlexItem>
    );
  }
);

function InterceptDisplayManager({
  ackIntercept,
  intercept$,
  staticAssetsHelper,
}: InterceptDialogManagerProps) {
  const { euiTheme } = useEuiTheme();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentIntercept, setCurrentIntercept] = useState<Intercept | null>(null);
  const feedbackStore = useRef<Record<string, unknown>>({});
  const interceptRenderMark = useRef<PerformanceMark>();

  const styles = useMemo(
    () => interceptDisplayManagerStyles(euiTheme, staticAssetsHelper),
    [euiTheme, staticAssetsHelper]
  );

  useEffect(() => {
    const subscription = intercept$.subscribe((intercept: Intercept) => {
      setCurrentIntercept(intercept);
      setCurrentStepIndex(0); // Reset to first step
      feedbackStore.current = {}; // Clear previous feedback
      interceptRenderMark.current = performance.mark(`intercept-${intercept.id}-RenderMark`);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [intercept$]);

  const handleTerminationInteraction = useCallback(
    (terminationType: InterceptApiAckProps['ackType']) => {
      if (!currentIntercept) return null;

      // reset the intercept render state first before acknowledging the intercept,
      // so that we don't have a situation where another intercept is to be displayed,
      // but because we've signaled that a new intercept can be displayed,
      // that intercept gets pushed but then the state reset happens because of the async nature of react state updates,
      // if this happens the coordination lock will be held on to without any way to release it
      setCurrentIntercept(null);
      setCurrentStepIndex(0);
      feedbackStore.current = {};

      switch (terminationType) {
        case 'dismissed': {
          currentIntercept.onDismiss?.({
            runId: currentIntercept.runId,
            stepId: currentIntercept.steps[0].id,
          });
          break;
        }
        case 'completed': {
          currentIntercept.onFinish?.({
            response: feedbackStore.current,
            runId: currentIntercept.runId,
          });
          break;
        }
        default: {
          throw new Error(`Invalid termination type: ${terminationType}`);
        }
      }

      ackIntercept({
        runId: currentIntercept.runId,
        interceptId: currentIntercept.id,
        ackType: terminationType,
        interactionDuration: performance.measure('interceptCompleteMark', {
          start: interceptRenderMark.current!.startTime,
          end: performance.now(),
        }).duration,
      });
    },
    [ackIntercept, currentIntercept]
  );

  const seekNextStep = useCallback(
    (isLastStep?: boolean) => {
      if (isLastStep) {
        return handleTerminationInteraction('completed');
      }

      setCurrentStepIndex((prevStepIndex) => {
        return Math.min(prevStepIndex + 1, currentIntercept!.steps.length);
      });
    },
    [handleTerminationInteraction, currentIntercept]
  );

  const dismissProductIntercept = useCallback(() => {
    return handleTerminationInteraction('dismissed');
  }, [handleTerminationInteraction]);

  const onInterceptStepInput = useCallback(
    function (this: InterceptSteps, value: unknown) {
      feedbackStore.current[this.id] = value;
      currentIntercept!.onProgress?.({
        stepId: this.id,
        stepResponse: value,
        runId: currentIntercept!.runId,
      });
      seekNextStep();
    },
    [currentIntercept, seekNextStep]
  );

  const currentInterceptStep = useMemo(() => {
    return currentIntercept?.steps?.[currentStepIndex ?? 0];
  }, [currentIntercept, currentStepIndex]);

  const isLastStep = useMemo(() => {
    return !!currentIntercept && currentStepIndex === currentIntercept.steps.length - 1;
  }, [currentIntercept, currentStepIndex]);

  const isStartStep = currentStepIndex === 0;

  return (
    <>
      {!(currentIntercept && currentInterceptStep) ? null : (
        <EuiPortal>
          <EuiSplitPanel.Outer
            grow
            role="dialog"
            css={styles.wrapper}
            data-test-subj={`intercept-${currentIntercept.id}`}
          >
            <EuiSplitPanel.Inner
              css={css([styles.stepContentBox, isStartStep && styles.startIllustration])}
              data-test-subj={`interceptStep-${currentInterceptStep.id}`}
            >
              <EuiFlexGroup
                gutterSize="s"
                direction="column"
                css={css({
                  ...(isStartStep ? styles.startContentBox : {}),
                })}
              >
                <EuiFlexItem>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiTitle size="xs">
                        <h2>{currentInterceptStep!.title}</h2>
                      </EuiTitle>
                    </EuiFlexItem>
                    {currentStepIndex > 0 && !isLastStep && (
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          iconType="cross"
                          aria-label="Close dialog"
                          onClick={dismissProductIntercept}
                          color="text"
                        />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiForm fullWidth>
                    {React.createElement(currentInterceptStep!.content, {
                      onValue: onInterceptStepInput.bind(currentInterceptStep),
                    })}
                  </EuiForm>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiSplitPanel.Inner>
            <EuiSplitPanel.Inner grow={false} color="subdued" css={styles.stepFooterBox}>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem grow={false}>
                  <InterceptProgressIndicator
                    stepsTotal={currentIntercept.steps.length}
                    currentStep={currentStepIndex}
                  />
                </EuiFlexItem>
                {(isStartStep || isLastStep) && (
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="xs">
                      {isStartStep && (
                        <EuiFlexItem>
                          <EuiButtonEmpty
                            size="s"
                            data-test-subj="productInterceptDismissButton"
                            onClick={dismissProductIntercept}
                            color="text"
                          >
                            {i18n.translate('core.notifications.productIntercept.dismiss', {
                              defaultMessage: 'Not now',
                            })}
                          </EuiButtonEmpty>
                        </EuiFlexItem>
                      )}
                      <EuiFlexItem>
                        <EuiButton
                          size="s"
                          data-test-subj="productInterceptProgressionButton"
                          onClick={() => seekNextStep(isLastStep)}
                        >
                          {isLastStep
                            ? i18n.translate('core.notifications.productIntercept.nextStep', {
                                defaultMessage: 'Close',
                              })
                            : i18n.translate('core.notifications.productIntercept.nextStep', {
                                defaultMessage: 'Next',
                              })}
                        </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiPortal>
      )}
    </>
  );
}

export const InterceptDisplayManagerMemoized = React.memo(InterceptDisplayManager);
