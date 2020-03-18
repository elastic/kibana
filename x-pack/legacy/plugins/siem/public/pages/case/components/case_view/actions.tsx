/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';

import { Redirect } from 'react-router-dom';
import * as i18n from './translations';
import { useDeleteCases } from '../../../../containers/case/use_delete_cases';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';
import { SiemPageName } from '../../../home/types';
import { PropertyActions } from '../property_actions';

interface CaseViewActions {
  caseId: string;
  caseTitle: string;
}

const CaseViewActionsComponent: React.FC<CaseViewActions> = ({ caseId, caseTitle }) => {
  // Delete case
  const {
    handleToggleModal,
    handleOnDeleteConfirm,
    isDeleted,
    isDisplayConfirmDeleteModal,
  } = useDeleteCases();

  const confirmDeleteModal = useMemo(
    () => (
      <ConfirmDeleteCaseModal
        caseTitle={caseTitle}
        isModalVisible={isDisplayConfirmDeleteModal}
        isPlural={false}
        onCancel={handleToggleModal}
        onConfirm={handleOnDeleteConfirm.bind(null, [caseId])}
      />
    ),
    [isDisplayConfirmDeleteModal]
  );
  // TO DO refactor each of these const's into their own components
  const propertyActions = [
    {
      iconType: 'trash',
      label: i18n.DELETE_CASE,
      onClick: handleToggleModal,
    },
    {
      iconType: 'popout',
      label: 'View ServiceNow incident',
      onClick: () => null,
    },
    {
      iconType: 'importAction',
      label: 'Update ServiceNow incident',
      onClick: () => null,
    },
  ];

  if (isDeleted) {
    return <Redirect to={`/${SiemPageName.case}`} />;
  }
  return (
    <>
      <PropertyActions propertyActions={propertyActions} />
      {confirmDeleteModal}
    </>
  );
};

export const CaseViewActions = React.memo(CaseViewActionsComponent);
