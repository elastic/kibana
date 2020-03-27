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
import { Case } from '../../../../containers/case/types';

interface CaseViewActions {
  caseData: Case;
}

const CaseViewActionsComponent: React.FC<CaseViewActions> = ({ caseData }) => {
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
        caseTitle={caseData.title}
        isModalVisible={isDisplayConfirmDeleteModal}
        isPlural={false}
        onCancel={handleToggleModal}
        onConfirm={handleOnDeleteConfirm.bind(null, [caseData.id])}
      />
    ),
    [isDisplayConfirmDeleteModal, caseData]
  );
  // TO DO refactor each of these const's into their own components
  const propertyActions = useMemo(
    () => [
      {
        iconType: 'trash',
        label: i18n.DELETE_CASE,
        onClick: handleToggleModal,
      },
      ...(caseData.externalService?.externalUrl !== null
        ? [
            {
              iconType: 'popout',
              label: i18n.VIEW_INCIDENT(caseData.externalService?.externalTitle ?? ''),
              onClick: () => window.open(caseData.externalService?.externalUrl, '_blank'),
            },
          ]
        : []),
    ],
    [handleToggleModal, caseData]
  );

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
