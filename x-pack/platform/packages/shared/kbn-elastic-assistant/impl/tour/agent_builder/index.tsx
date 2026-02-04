/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTourStepProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiText,
  EuiTitle,
  EuiTourStep,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { css } from '@emotion/react';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common/telemetry';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../const';
import type { AgentBuilderTourState } from './step_config';
import { agentBuilderTourStep1, tourDefaultConfig } from './step_config';
import { AGENT_BUILDER_TOUR_CONTINUE, AGENT_BUILDER_TOUR_SKIP } from './translations';
import { useTourStorageKey } from '../common/hooks/use_tour_storage_key';

interface Props {
  analytics?: AnalyticsServiceStart;
  children?: EuiTourStepProps['children'];
  isDisabled: boolean;
  storageKey: NEW_FEATURES_TOUR_STORAGE_KEYS;
  onContinue?: () => void;
}

const AgentBuilderTourStepComponent: React.FC<Props> = ({
  analytics,
  children,
  isDisabled,
  storageKey,
  onContinue,
}) => {
  const { euiTheme } = useEuiTheme();
  const tourStorageKey = useTourStorageKey(storageKey);
  const [tourState, setTourState] = useLocalStorage<AgentBuilderTourState>(
    tourStorageKey,
    tourDefaultConfig
  );

  const shouldShowTour = tourState?.isTourActive && !isDisabled;
  const [isTimerExhausted, setIsTimerExhausted] = useState(false);

  const { notifications } = useKibana().services;
  const userAllowsTours = notifications?.tours.isEnabled() ?? true;

  useEffect(() => {
    if (shouldShowTour && userAllowsTours) {
      const timer = setTimeout(() => {
        setIsTimerExhausted(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [shouldShowTour, userAllowsTours]);

  const finishTour = useCallback(() => {
    setTourState((prev = tourDefaultConfig) => ({
      ...prev,
      isTourActive: false,
    }));
  }, [setTourState]);

  const handleContinue = useCallback(() => {
    finishTour();
    // Track opt-in step reached from tour
    analytics?.reportEvent(AGENT_BUILDER_EVENT_TYPES.OptInAction, {
      action: 'step_reached',
      source: 'security_ab_tour',
    });
    onContinue?.();
  }, [finishTour, onContinue, analytics]);

  if (!children) {
    return null;
  }

  const isStepOpen = shouldShowTour && isTimerExhausted && userAllowsTours;

  return (
    <EuiTourStep
      id="agentBuilderTourStep"
      css={css`
        display: flex;
      `}
      content={<EuiText size="m">{agentBuilderTourStep1.content}</EuiText>}
      isStepOpen={isStepOpen}
      maxWidth={384}
      onFinish={finishTour}
      panelProps={{
        'data-test-subj': 'agentBuilderTourStepPanel',
      }}
      step={1}
      stepsTotal={1}
      title={
        <EuiTitle size="xs">
          <span>{agentBuilderTourStep1.title}</span>
        </EuiTitle>
      }
      footerAction={[
        <EuiButtonEmpty key="skip" size="s" color="text" flush="right" onClick={finishTour}>
          {AGENT_BUILDER_TOUR_SKIP}
        </EuiButtonEmpty>,
        <EuiButton key="continue" size="s" color="success" onClick={handleContinue}>
          {AGENT_BUILDER_TOUR_CONTINUE}
        </EuiButton>,
      ]}
      panelStyle={{
        fontSize: euiTheme.size.m,
      }}
    >
      {children}
    </EuiTourStep>
  );
};

export const AgentBuilderTourStep = React.memo(AgentBuilderTourStepComponent);
