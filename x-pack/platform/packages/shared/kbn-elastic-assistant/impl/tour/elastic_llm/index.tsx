/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiText,
  EuiTitle,
  EuiTourStep,
  EuiTourStepProps,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { css } from '@emotion/react';
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../const';
import { EISUsageCostTourState, elasticLLMTourStep1, tourDefaultConfig } from './step_config';
import { ELASTIC_LLM_TOUR_FINISH_TOUR } from './translations';
import { useAssistantContext } from '../../assistant_context';
import { useLoadConnectors } from '../../connectorland/use_load_connectors';
import { isElasticManagedLlmConnector } from '../../connectorland/helpers';
import { useTourStorageKey } from '../common/hooks/use_tour_storage_key';

interface Props {
  children?: EuiTourStepProps['children'];
  isDisabled: boolean;
  selectedConnectorId: string | undefined;
  storageKey: NEW_FEATURES_TOUR_STORAGE_KEYS;
  zIndex?: number;
  wrapper?: boolean;
}

const ElasticLLMCostAwarenessTourComponent: React.FC<Props> = ({
  children,
  isDisabled,
  selectedConnectorId,
  storageKey,
  zIndex,
  wrapper = true, // Whether to wrap the children in a div with padding
}) => {
  const { http, inferenceEnabled } = useAssistantContext();
  const { euiTheme } = useEuiTheme();
  const tourStorageKey = useTourStorageKey(storageKey);
  const [tourState, setTourState] = useLocalStorage<EISUsageCostTourState>(
    tourStorageKey,
    tourDefaultConfig
  );

  const [showTour, setShowTour] = useState(!tourState?.isTourActive && !isDisabled);

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
  }, [setTourState, setShowTour]);

  const { data: aiConnectors } = useLoadConnectors({
    http,
    inferenceEnabled,
  });
  const isElasticLLMConnectorSelected = useMemo(
    () =>
      aiConnectors?.some((c) => isElasticManagedLlmConnector(c) && c.id === selectedConnectorId),
    [aiConnectors, selectedConnectorId]
  );

  useEffect(() => {
    if (
      !inferenceEnabled ||
      isDisabled ||
      !tourState?.isTourActive ||
      aiConnectors?.length === 0 ||
      !isElasticLLMConnectorSelected
    ) {
      setShowTour(false);
    } else {
      setShowTour(true);
    }
  }, [
    tourState,
    isDisabled,
    children,
    showTour,
    inferenceEnabled,
    aiConnectors?.length,
    isElasticLLMConnectorSelected,
    setTourState,
  ]);

  if (!children) {
    return null;
  }

  if (!showTour) {
    return children;
  }

  return (
    <EuiTourStep
      id="elasticLLMTourStep"
      css={css`
        display: flex;
      `}
      content={<EuiText size="m">{elasticLLMTourStep1.content}</EuiText>}
      // Open the tour step after flyout is open
      isStepOpen={isTimerExhausted}
      maxWidth={384}
      onFinish={finishTour}
      panelProps={{
        'data-test-subj': `elasticLLMTourStepPanel`,
      }}
      step={1}
      stepsTotal={1}
      title={
        <EuiTitle size="xs">
          <span>{elasticLLMTourStep1.title}</span>
        </EuiTitle>
      }
      subtitle={
        <EuiTitle
          size="xxs"
          css={css`
            color: ${euiTheme.colors.textSubdued};
          `}
        >
          <span>{elasticLLMTourStep1.subTitle}</span>
        </EuiTitle>
      }
      footerAction={[
        <EuiButtonEmpty size="s" color="text" flush="right" onClick={finishTour}>
          {ELASTIC_LLM_TOUR_FINISH_TOUR}
        </EuiButtonEmpty>,
      ]}
      panelStyle={{
        fontSize: euiTheme.size.m,
      }}
      zIndex={zIndex}
    >
      {wrapper ? (
        <div
          style={{
            paddingLeft: euiTheme.size.m,
          }}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </EuiTourStep>
  );
};

export const ElasticLLMCostAwarenessTour = React.memo(ElasticLLMCostAwarenessTourComponent);
