/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
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
  euiFlyoutSlideInRight,
  euiCanAnimate,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiForm,
  EuiButtonIcon,
} from '@elastic/eui';
import type { HttpStart } from '@kbn/core-http-browser';
import type { EuiTourStepStatus } from '@elastic/eui/src/components/tour/tour_step_indicator';
import { InterceptDialogApi } from '../../service/intercept_dialog_api';

export type Intercept = Rx.ObservedValueOf<ReturnType<InterceptDialogApi['get$']>>[number];

const INTERCEPT_ILLUSTRATION_WIDTH = 89; // Magic number was provided by Ryan

interface InterceptDialogManagerProps {
  ackIntercept: (args: Parameters<InterceptDialogApi['ack']>[0] & Pick<Intercept, 'runId'>) => void;
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

export function InterceptDisplayManager({
  ackIntercept,
  intercept$,
  staticAssetsHelper,
}: InterceptDialogManagerProps) {
  const interceptRenderMark = useRef<PerformanceMark>();
  const { euiTheme } = useEuiTheme();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentIntercept, setCurrentIntercept] = useState<Intercept | null>(null);
  const feedbackStore = useRef<Record<string, unknown>>({});
  const startIllustrationStyle = useRef(css`
    background: var(
      --intercept-background,
      url(${staticAssetsHelper.getPluginAssetHref('communication.svg')})
    );
    background-size: ${INTERCEPT_ILLUSTRATION_WIDTH}px 64px;
    background-repeat: no-repeat;
    background-position: top ${euiTheme.size.base} right ${euiTheme.size.base};
  `);

  useEffect(() => {
    const subscription = intercept$.subscribe((intercept) => {
      setCurrentStepIndex(0);
      setCurrentIntercept(intercept);
      interceptRenderMark.current = performance.mark(`intercept-${intercept.id}-RenderMark`);
    });

    return () => subscription.unsubscribe();
  }, [intercept$]);

  const currentInterceptStep = useMemo(() => {
    return currentIntercept?.steps?.[currentStepIndex];
  }, [currentIntercept, currentStepIndex]);

  const nextStep = useCallback(
    (isLastStep?: boolean) => {
      setCurrentStepIndex((prevStepIndex) => {
        if (isLastStep) {
          currentIntercept?.onFinish?.({
            response: feedbackStore.current,
            runId: currentIntercept!.runId,
          });
          setCurrentStepIndex(0);
          // this will cause the component to unmount
          ackIntercept({
            runId: currentIntercept!.runId,
            interceptId: currentIntercept!.id,
            ackType: 'completed',
            interactionDuration: performance.measure('interceptCompleteMark', {
              start: interceptRenderMark.current!.startTime,
              end: performance.now(),
            }).duration,
          });
        }

        return Math.min(prevStepIndex + 1, currentIntercept!.steps.length);
      });
    },
    [ackIntercept, currentIntercept]
  );

  const dismissProductIntercept = useCallback(() => {
    const runId = currentIntercept!.runId;

    ackIntercept({
      interceptId: currentIntercept!.id,
      runId,
      ackType: 'dismissed',
      interactionDuration: performance.measure('interceptDismissedMark', {
        start: interceptRenderMark.current!.startTime,
        end: performance.now(),
      }).duration,
    });

    currentIntercept?.onDismiss?.({ runId, stepId: currentInterceptStep!.id });
    setCurrentIntercept(null);
  }, [ackIntercept, currentIntercept, currentInterceptStep]);

  const onInputChange = useCallback(
    (value: unknown) => {
      feedbackStore.current[currentInterceptStep!.id] = value;
      currentIntercept?.onProgress?.({
        stepId: currentInterceptStep!.id,
        stepResponse: value,
        runId: currentIntercept!.runId,
      });
      nextStep();
    },
    [currentIntercept, currentInterceptStep, nextStep]
  );

  let isLastStep = false;
  const isStartStep = currentStepIndex === 0;

  return currentIntercept && currentInterceptStep ? (
    <EuiPortal>
      <EuiSplitPanel.Outer
        grow
        role="dialog"
        css={css`
          position: fixed;
          inline-size: 400px;
          max-block-size: auto;
          z-index: ${euiTheme.levels.toast};
          inset-inline-end: ${euiTheme.size.l};
          inset-block-end: ${euiTheme.size.xxl};

          ${euiCanAnimate} {
            animation: ${euiFlyoutSlideInRight} ${euiTheme.animation.normal}
              ${euiTheme.animation.resistance};
          }
        `}
        data-test-subj={`intercept-${currentIntercept.id}`}
      >
        <EuiSplitPanel.Inner
          css={css`
            min-height: 112px;
            position: relative;
            ${isStartStep && startIllustrationStyle.current};
          `}
          data-test-subj={`interceptStep-${currentInterceptStep.id}`}
        >
          <EuiFlexGroup
            gutterSize="s"
            direction="column"
            css={css({
              ...(isStartStep
                ? {
                    width: `calc(100% - ${INTERCEPT_ILLUSTRATION_WIDTH}px - ${euiTheme.size.base})`,
                  }
                : {}),
            })}
          >
            <EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h2>{currentInterceptStep!.title}</h2>
                  </EuiTitle>
                </EuiFlexItem>
                {currentStepIndex > 0 &&
                  !(isLastStep = currentStepIndex === currentIntercept.steps.length - 1) && (
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
                  onValue: onInputChange,
                })}
              </EuiForm>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner
          grow={false}
          color="subdued"
          css={css`
            border-top: ${euiTheme.border.thin};
          `}
        >
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
                        data-test-subj="productInterceptDismiss"
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
                      onClick={() => nextStep(isLastStep)}
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
  ) : null;
}
