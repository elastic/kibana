/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiPanel,
  EuiDescribedFormGroup,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';

import { MAX_CUSTOM_OBSERVABLE_TYPES } from '../../../common/constants';
import * as i18n from './translations';
import { useCasesContext } from '../cases_context/use_cases_context';
import type { ObservableTypesConfiguration } from '../../../common/types/domain';
import { ObservableTypesList } from './observable_types_list';

export interface ObservableTypesProps {
  observableTypes: ObservableTypesConfiguration;
  disabled: boolean;
  hideTitle?: boolean;
  isLoading: boolean;
  handleAddObservableType: () => void;
  handleDeleteObservableType: (key: string) => void;
  handleEditObservableType: (key: string) => void;
  /**
   * Renders the list without the surrounding subdued panel, as line-separated
   * rows. Only used by the cases redesign settings page.
   */
  useLineSeparators?: boolean;
}
const ObservableTypesComponent: React.FC<ObservableTypesProps> = ({
  disabled,
  hideTitle = false,
  isLoading,
  handleAddObservableType,
  handleDeleteObservableType,
  handleEditObservableType,
  observableTypes,
  useLineSeparators = false,
}) => {
  const { permissions } = useCasesContext();
  const canModifyObservableTypes = !disabled && permissions.settings;

  const onAddObservableType = useCallback(() => {
    handleAddObservableType();
  }, [handleAddObservableType]);

  const onEditObservableType = useCallback(
    (key: string) => {
      handleEditObservableType(key);
    },
    [handleEditObservableType]
  );

  if (!permissions.settings) {
    return null;
  }

  const listAndFooter = (
    <>
      {observableTypes.length ? (
        <ObservableTypesList
          disabled={!canModifyObservableTypes}
          observableTypes={observableTypes}
          onDeleteObservableType={handleDeleteObservableType}
          onEditObservableType={onEditObservableType}
          useLineSeparators={useLineSeparators}
        />
      ) : null}
      <EuiSpacer size="s" />
      {!observableTypes.length ? (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false} data-test-subj="empty-observable-types">
            {i18n.NO_OBSERVABLE_TYPES}
            <EuiSpacer size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          {observableTypes.length < MAX_CUSTOM_OBSERVABLE_TYPES ? (
            <EuiButtonEmpty
              isLoading={isLoading}
              isDisabled={!canModifyObservableTypes}
              size="s"
              onClick={onAddObservableType}
              iconType="plusCircle"
              data-test-subj="add-observable-type"
            >
              {i18n.ADD_OBSERVABLE_TYPE}
            </EuiButtonEmpty>
          ) : (
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiText>{i18n.MAX_OBSERVABLE_TYPES_LIMIT(MAX_CUSTOM_OBSERVABLE_TYPES)}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );

  const observableTypesContent = useLineSeparators ? (
    listAndFooter
  ) : (
    <EuiPanel
      data-test-subj="observable-types-panel"
      paddingSize="s"
      color="subdued"
      hasBorder={false}
      hasShadow={false}
    >
      {listAndFooter}
      <EuiSpacer size="s" />
    </EuiPanel>
  );

  // Always render the same outer `<div>` for `observable-types-form-group` regardless of
  // `hideTitle`, so the container element's structure doesn't depend on the caller.
  const content = hideTitle ? (
    observableTypesContent
  ) : (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <h2>{i18n.TITLE}</h2>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      description={<p>{i18n.DESCRIPTION}</p>}
    >
      {observableTypesContent}
    </EuiDescribedFormGroup>
  );

  return <div data-test-subj="observable-types-form-group">{content}</div>;
};
ObservableTypesComponent.displayName = 'ObservableTypesComponent';

export const ObservableTypes = React.memo(ObservableTypesComponent);
