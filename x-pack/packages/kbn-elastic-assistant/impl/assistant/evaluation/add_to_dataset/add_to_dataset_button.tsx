/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiButton,
  EuiButtonIcon,
  EuiPopover,
  EuiToolTip,
  EuiIcon,
  EuiComboBox,
  EuiFormRow,
  EuiComboBoxOptionOption,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import type { GetDatasetsResponse } from '@kbn/elastic-assistant-common';
import { PostDataset } from '@kbn/elastic-assistant-common/impl/schemas';
import { Conversation, useAssistantContext } from '../../../..';
import * as i18n from './translations';
import { useDatasets } from '../../api/datasets/use_datasets';
import { useAddToDataset } from '../../api/datasets/use_add_to_dataset';

interface Props {
  selectedConversation: Conversation | undefined;
}

/**
 * Add selected messages to a test dataset
 */
export const AddToDatasetButton: React.FC<Props> = React.memo(({ selectedConversation }) => {
  const { http } = useAssistantContext();

  // Remote Datasets
  const { data: datasetsData } = useDatasets({ http });
  const datasets = useMemo(
    () => (datasetsData as GetDatasetsResponse)?.datasets ?? [],
    [datasetsData]
  );
  const {
    data: addToDatasetResponse,
    mutate: addToDataset,
    isLoading: isAddingToDataset,
  } = useAddToDataset({
    http,
  });

  useEffect(() => {
    // console.log('addToDatasetResponse', addToDatasetResponse);
  }, [addToDatasetResponse]);

  // Popover State
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => {
    setIsPopoverOpen(!isPopoverOpen);
  }, [isPopoverOpen, setIsPopoverOpen]);

  // Popover Content
  const [selectedDatasetOptions, setSelectedDatasetOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const onDatasetOptionsChange = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      setSelectedDatasetOptions(selectedOptions);
    },
    [setSelectedDatasetOptions]
  );

  const onDatasetOptionsCreate = useCallback((searchValue: string) => {
    const normalizedSearchValue = searchValue.trim();

    if (!normalizedSearchValue) {
      return;
    }

    setSelectedDatasetOptions([{ label: normalizedSearchValue }]);
  }, []);
  const datasetOptions = useMemo(() => {
    return datasets.map((label) => ({ label }));
  }, [datasets]);

  // Actions
  const handleAddToDataset = useCallback(() => {
    const messageIds =
      selectedConversation?.messages.filter((m) => m.isSelected).map((m) => m.content ?? '') ?? [];

    const datasetId = selectedDatasetOptions[0]?.label;
    if (datasetId && messageIds.length > 1) {
      const dataset: PostDataset = [
        {
          input: messageIds[0],
          reference: messageIds[1],
        },
      ];
      addToDataset({ datasetId, dataset });
    }
  }, [addToDataset, selectedConversation?.messages, selectedDatasetOptions]);

  const selectedMessageCount =
    selectedConversation?.messages.filter((m) => m.isSelected).length ?? 0;
  const isDisabled = selectedMessageCount === 0;

  return (
    <>
      <EuiPopover
        button={
          <EuiToolTip
            position="right"
            content={
              <FormattedMessage
                defaultMessage="Select messages using the {addIcon} message action, then click here to add to a dataset"
                id="xpack.elasticAssistant.assistant.evaluation.addToDataset.buttonTooltip"
                values={{
                  addIcon: <EuiIcon type="listAdd" />,
                }}
              />
            }
          >
            <EuiButtonIcon
              aria-label={i18n.ADD_TO_DATASET_POPOVER_TITLE(selectedMessageCount)}
              data-test-subj="add-to-dataset"
              onClick={togglePopover}
              isDisabled={isDisabled}
              iconType="listAdd"
              size="xs"
            />
          </EuiToolTip>
        }
        isOpen={isPopoverOpen}
        closePopover={togglePopover}
        anchorPosition="downRight"
      >
        <EuiPopoverTitle>{i18n.ADD_TO_DATASET_POPOVER_TITLE(selectedMessageCount)}</EuiPopoverTitle>
        <EuiFormRow
          label={i18n.DATASET_COMBO_BOX_LABEL}
          helpText={i18n.ADD_TO_DATASET_POPOVER_DESCRIPTION}
          display="rowCompressed"
        >
          <EuiComboBox
            aria-label={i18n.DATASET_COMBO_BOX_LABEL}
            placeholder={i18n.DATASET_COMBO_BOX_HELP_TEXT}
            singleSelection={{ asPlainText: true }}
            options={datasetOptions}
            selectedOptions={selectedDatasetOptions}
            onChange={onDatasetOptionsChange}
            onCreateOption={onDatasetOptionsCreate}
            customOptionText={i18n.DATASET_COMBO_BOX_LABEL_CUSTOM_OPTION}
            compressed={true}
          />
        </EuiFormRow>
        <EuiPopoverFooter>
          <EuiButton
            fullWidth
            size="s"
            isLoading={isAddingToDataset}
            onClick={handleAddToDataset}
            disabled={selectedConversation === null}
          >
            {i18n.ADD_TO_DATASET_BUTTON}
          </EuiButton>
        </EuiPopoverFooter>
      </EuiPopover>
    </>
  );
});

AddToDatasetButton.displayName = 'AddToDatasetButton';
