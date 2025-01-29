/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useState, useMemo } from 'react';
import {
  EuiComboBox,
  type EuiComboBoxOptionOption,
  type EuiComboBoxProps,
  euiPaletteColorBlindBehindText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { countBy } from 'lodash';
import useMount from 'react-use/lib/useMount';
import { useMlApi } from '../../contexts/kibana';
import { useToastNotificationService } from '../../services/toast_notification_service';
import { useEnabledFeatures } from '../../contexts/ml';

type EntityType = 'anomaly_detector' | 'data_frame_analytics' | 'trained_models';

type EntitiesSelection = Array<{ id: string; type: EntityType }>;

export interface MlEntitySelectorProps {
  entityTypes?: Partial<{ [key in EntityType]: boolean }>;
  multiSelect?: boolean;
  /**
   * Array of selected ids
   */
  selectedOptions?: Array<{ id: string; type?: EntityType }>;
  onSelectionChange?: (jobSelection: EntitiesSelection) => void;
  /**
   * In case the there are duplicated IDs across different ML entity types,
   * they should be de-selected simultaneously if this setting is enabled.
   */
  handleDuplicates?: boolean;
}

const defaultEntities = {
  anomaly_detector: true,
  data_frame_analytics: true,
  trained_models: true,
};

/**
 * Reusable component for picking ML entities.
 *
 * @param entityTypes
 * @param multiSelect
 * @param selectedOptions
 * @param onSelectionChange
 * @param handleDuplicates
 * @constructor
 */
export const MlEntitySelector: FC<MlEntitySelectorProps> = ({
  entityTypes = defaultEntities,
  multiSelect = true,
  selectedOptions,
  onSelectionChange,
  handleDuplicates = false,
}) => {
  const { isADEnabled, isDFAEnabled, isNLPEnabled } = useEnabledFeatures();
  const { jobs: jobsApi, trainedModels, dataFrameAnalytics } = useMlApi();
  const { displayErrorToast } = useToastNotificationService();
  const visColorsBehindText = euiPaletteColorBlindBehindText();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);

  const fetchOptions = useCallback(async () => {
    try {
      const newOptions: Array<EuiComboBoxOptionOption<string>> = [];
      if (isADEnabled && entityTypes?.anomaly_detector) {
        const { jobIds: jobIdOptions } = await jobsApi.getAllJobAndGroupIds();

        newOptions.push({
          label: i18n.translate('xpack.ml.mlEntitySelector.adOptionsLabel', {
            defaultMessage: 'Anomaly detection jobs',
          }),
          isGroupLabelOption: true,
          color: visColorsBehindText[0],
          options: jobIdOptions.map((adId) => ({
            label: adId,
            value: adId,
            id: `anomaly_detector:${adId}`,
            key: `anomaly_detector:${adId}`,
            color: visColorsBehindText[0],
            'data-test-subj': `mlAdJobOption`,
          })),
        });
      }

      if (isDFAEnabled && entityTypes?.data_frame_analytics) {
        const dfa = await dataFrameAnalytics.getDataFrameAnalytics();
        if (dfa.count > 0) {
          newOptions.push({
            label: i18n.translate('xpack.ml.mlEntitySelector.dfaOptionsLabel', {
              defaultMessage: 'Data frame analytics',
            }),
            isGroupLabelOption: true,
            options: dfa.data_frame_analytics.map(({ id: dfaId }) => ({
              label: dfaId,
              value: dfaId,
              id: `data_frame_analytics:${dfaId}`,
              key: `data_frame_analytics:${dfaId}`,
              color: visColorsBehindText[2],
              'data-test-subj': `mlDfaJobOption`,
            })),
          });
        }
      }

      if ((isDFAEnabled || isNLPEnabled) && entityTypes?.trained_models) {
        const models = await trainedModels.getTrainedModels();
        if (models.length > 0) {
          newOptions.push({
            label: i18n.translate('xpack.ml.mlEntitySelector.trainedModelsLabel', {
              defaultMessage: 'Trained models',
            }),
            isGroupLabelOption: true,
            options: models.map(({ model_id: modelId }) => ({
              label: modelId,
              value: modelId,
              id: `trained_models:${modelId}`,
              key: `trained_models:${modelId}`,
              color: visColorsBehindText[3],
              'data-test-subj': `mlTrainedModelOption`,
            })),
          });
        }
      }

      setOptions(newOptions);
    } catch (error) {
      displayErrorToast(
        error,
        i18n.translate('xpack.ml.mlEntitySelector.fetchError', {
          defaultMessage: 'Failed to fetch ML entities',
        })
      );
    }
    setIsLoading(false);
  }, [
    jobsApi,
    trainedModels,
    dataFrameAnalytics,
    entityTypes,
    visColorsBehindText,
    displayErrorToast,
    isADEnabled,
    isDFAEnabled,
    isNLPEnabled,
  ]);

  useMount(function fetchOptionsOnMount() {
    fetchOptions();
  });

  const selectedEntities = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    return (selectedOptions ?? []).flatMap((o) => {
      const fromOptions = options
        .flatMap((g) => g.options)
        .filter((op): op is EuiComboBoxOptionOption<string> => op!.value === o.id);
      return fromOptions.length > 0
        ? fromOptions
        : [
            {
              value: o.id,
              label: o.id,
              key: `unknown:${o.id}`,
              'data-test-subj': `mlUnknownOption ${o.id}`,
            },
          ];
    });
  }, [options, selectedOptions]);

  const onChange = useCallback<Exclude<EuiComboBoxProps<string>['onChange'], undefined>>(
    (selection) => {
      if (!onSelectionChange) return;

      let resultSelection = selection;

      if (handleDuplicates) {
        const prevCounts = countBy(selectedEntities, 'value');
        const currentCounts = countBy(selection, 'value');
        resultSelection = resultSelection.filter(({ value }) => {
          // If an ID with duplicates has been removed, delete all of them.
          return !(prevCounts[value!] > 1 && currentCounts[value!] < prevCounts[value!]);
        });
      }

      onSelectionChange(
        resultSelection.map((s) => {
          const [type] = s.key!.split(':');
          return { id: s.value!, type: type as EntityType };
        })
      );
    },
    [onSelectionChange, selectedEntities, handleDuplicates]
  );

  return (
    <EuiComboBox<string>
      autoFocus={true}
      isLoading={isLoading}
      singleSelection={!multiSelect}
      selectedOptions={selectedEntities}
      options={options}
      onChange={onChange}
      fullWidth
      data-test-subj={`mlEntitySelector_${isLoading ? 'loading' : 'loaded'}`}
      isInvalid={false}
    />
  );
};
