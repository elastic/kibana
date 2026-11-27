/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { MAX_AI_INDEX_DESCRIPTION_LENGTH } from '../../../../../../common/constants';
import { useSaveAiIndexDescription } from '../../../../hooks/use_save_ai_index_description';
import { validateTextInput } from '../../../../utils/validate_text_input';
import { AiIndexDescriptionField } from '../../../ai_index_description_field';
import { SetupWizardStepLayout } from '../setup_wizard_step_layout';
import type { SetupWizardStep, SetupWizardStepContentProps } from '../types';

const blankDescriptionError = i18n.translate('xpack.contextEngine.setupWizard.descriptionBlank', {
  defaultMessage: 'Enter a description.',
});

const DescribeStepContent = ({ aiIndex, layout }: SetupWizardStepContentProps) => {
  const { saveDescription } = useSaveAiIndexDescription();
  const savedDescription = aiIndex.description ?? '';
  const [description, setDescription] = useState(savedDescription);

  const trimmedDescription = description.trim();
  const validation = validateTextInput({
    value: trimmedDescription,
    maxLength: MAX_AI_INDEX_DESCRIPTION_LENGTH,
  });
  // An empty field shows no error, because the button says Skip there.
  const isOnlySpaces = description.length > 0 && trimmedDescription.length === 0;

  return (
    <SetupWizardStepLayout
      {...layout}
      hasChanges={description !== savedDescription}
      canContinue={trimmedDescription.length > 0 && validation.valid}
      onSave={() => saveDescription(aiIndex, trimmedDescription)}
    >
      <AiIndexDescriptionField
        value={description}
        onChange={setDescription}
        error={isOnlySpaces ? blankDescriptionError : validation.error}
        warning={validation.warning}
        // Text typed during the save would not be saved.
        isDisabled={layout.isBusy}
        data-test-subj="contextSetupWizardDescription"
      />
    </SetupWizardStepLayout>
  );
};

export const describeStep: SetupWizardStep = {
  id: 'describe',
  texts: {
    stepTitle: i18n.translate('xpack.contextEngine.setupWizard.describe.stepTitle', {
      defaultMessage: 'Describe index',
    }),
    title: i18n.translate('xpack.contextEngine.setupWizard.describe.title', {
      defaultMessage: 'Describe this index',
    }),
    description: i18n.translate('xpack.contextEngine.setupWizard.describe.description', {
      defaultMessage: 'Agents read the description to decide when to use this index.',
    }),
    docsLinkLabel: i18n.translate('xpack.contextEngine.setupWizard.describe.docsLink', {
      defaultMessage: 'Describe an AI index',
    }),
  },
  getDocsLink: ({ aiIndices }) => aiIndices,
  isDone: ({ aiIndex }) => (aiIndex.description ?? '').trim().length > 0,
  Content: DescribeStepContent,
};
