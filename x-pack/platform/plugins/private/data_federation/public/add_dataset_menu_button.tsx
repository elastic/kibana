/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiContextMenu, EuiPopover } from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';

import {
  DATASET_WIZARD_FLOW_VARIANT_1,
  DATASET_WIZARD_FLOW_VARIANT_2,
  type DatasetWizardFlowVariant,
} from './create_dataset_wizard/dataset_wizard_flow_variant';
import { mainTranslations } from './main_i18n';

export interface AddDatasetMenuButtonProps {
  onSelectFlow: (flowVariant: DatasetWizardFlowVariant) => void;
}

export const AddDatasetMenuButton: FunctionComponent<AddDatasetMenuButtonProps> = ({
  onSelectFlow,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((open) => !open);
  }, []);

  const handleSelectFlow = useCallback(
    (flowVariant: DatasetWizardFlowVariant) => {
      closePopover();
      onSelectFlow(flowVariant);
    },
    [closePopover, onSelectFlow]
  );

  const panels = useMemo<EuiContextMenuPanelDescriptor[]>(
    () => [
      {
        id: 0,
        items: [
          {
            name: mainTranslations.columns.dataSets.addFlow1Label,
            onClick: () => handleSelectFlow(DATASET_WIZARD_FLOW_VARIANT_1),
            'data-test-subj': 'dataSetsSetsCreateFlow1Button',
          },
          {
            name: mainTranslations.columns.dataSets.addFlow2Label,
            onClick: () => handleSelectFlow(DATASET_WIZARD_FLOW_VARIANT_2),
            'data-test-subj': 'dataSetsSetsCreateFlow2Button',
          },
        ],
      },
    ],
    [handleSelectFlow]
  );

  const button = (
    <EuiButton
      fill
      color="primary"
      iconType="arrowDown"
      iconSide="right"
      data-test-subj="dataSetsSetsCreateButton"
      onClick={togglePopover}
    >
      {mainTranslations.columns.dataSets.addButtonLabel}
    </EuiButton>
  );

  return (
    <EuiPopover
      aria-label={mainTranslations.columns.dataSets.addMenuAriaLabel}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
      data-test-subj="dataSetsSetsCreateMenu"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
