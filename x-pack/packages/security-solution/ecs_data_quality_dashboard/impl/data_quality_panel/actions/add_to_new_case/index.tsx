/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiIcon, EuiLink } from '@elastic/eui';

import { useDataQualityContext } from '../../data_quality_context';
import { useAddToNewCase } from './hooks/use_add_to_new_case';
import { StyledLinkText } from '../styles';
import { ADD_TO_NEW_CASE } from '../../translations';

interface Props {
  markdownComment: string;
}

const AddToNewCaseActionComponent: React.FC<Props> = ({ markdownComment }) => {
  const { canUserCreateAndReadCases, openCreateCaseFlyout, ilmPhases } = useDataQualityContext();
  const { disabled: addToNewCaseDisabled, onAddToNewCase } = useAddToNewCase({
    canUserCreateAndReadCases,
    openCreateCaseFlyout,
  });

  const onClickAddToCase = useCallback(
    () => onAddToNewCase([markdownComment]),
    [markdownComment, onAddToNewCase]
  );

  const addToNewCaseContextMenuOnClick = useCallback(() => {
    onClickAddToCase();
  }, [onClickAddToCase]);

  const disableAll = ilmPhases.length === 0;

  return (
    <EuiLink
      aria-label={ADD_TO_NEW_CASE}
      data-test-subj="addToNewCase"
      disabled={addToNewCaseDisabled || disableAll}
      onClick={addToNewCaseContextMenuOnClick}
    >
      <StyledLinkText>
        <EuiIcon type="listAdd" />
        {ADD_TO_NEW_CASE}
      </StyledLinkText>
    </EuiLink>
  );
};

AddToNewCaseActionComponent.displayName = 'AddToNewCaseActionComponent';

export const AddToNewCaseAction = React.memo(AddToNewCaseActionComponent);
