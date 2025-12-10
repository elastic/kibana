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
import type { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../const';
import type { AgentBuilderTourState } from './step_config';
import { agentBuilderTourStep1, tourDefaultConfig } from './step_config';
import { AGENT_BUILDER_TOUR_CONTINUE, AGENT_BUILDER_TOUR_SKIP } from './translations';
import { useTourStorageKey } from '../common/hooks/use_tour_storage_key';

interface Props {
  children?: EuiTourStepProps['children'];
  isDisabled: boolean;
  storageKey: NEW_FEATURES_TOUR_STORAGE_KEYS;
  onContinue?: () => void;
}

const AgentBuilderTourStepComponent: React.FC<Props> = ({
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

  const [showTour, setShowTour] = useState(tourState?.isTourActive && !isDisabled);

  const [isTimerExhausted, setIsTimerExhausted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTimerExhausted(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const finishTour = useCallback(() => {
    setTourState((prev = tourDefaultConfig) => ({
      ...prev,
      isTourActive: false,
    }));
    setShowTour(false);
  }, [setTourState]);

  const handleContinue = useCallback(() => {
    finishTour();
    onContinue?.();
  }, [finishTour, onContinue]);

  useEffect(() => {
    if (isDisabled || !tourState?.isTourActive) {
      setShowTour(false);
    } else {
      setShowTour(true);
    }
  }, [tourState, isDisabled]);

  if (!children) {
    return null;
  }

  if (!showTour) {
    return children;
  }

  return (
    <EuiTourStep
      id="agentBuilderTourStep"
      css={css`
        display: flex;
      `}
      content={<EuiText size="m">{agentBuilderTourStep1.content}</EuiText>}
      isStepOpen={isTimerExhausted}
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
        <EuiButtonEmpty size="s" color="text" flush="right" onClick={finishTour}>
          {AGENT_BUILDER_TOUR_SKIP}
        </EuiButtonEmpty>,
        <EuiButton size="s" color="success" onClick={handleContinue}>
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
