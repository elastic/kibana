/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiButtonIcon,
} from '@elastic/eui';
import * as i18n from '../translations';

import type { ObservableTypesConfiguration } from '../../../../common/types/domain';
import { DeleteConfirmationModal } from '../../configure_cases/delete_confirmation_modal';

export interface ObservableTypesListProps {
  disabled: boolean;
  observableTypes: ObservableTypesConfiguration;
  onDeleteObservableType: (key: string) => void;
  onEditObservableType: (key: string) => void;
}

const ObservableTypesListComponent: React.FC<ObservableTypesListProps> = (props) => {
  const { observableTypes, onDeleteObservableType, onEditObservableType } = props;
  const [selectedItem, setSelectedItem] = useState<ObservableTypesConfiguration[number] | null>(
    null
  );

  const onConfirm = useCallback(() => {
    if (selectedItem) {
      onDeleteObservableType(selectedItem.key);
    }

    setSelectedItem(null);
  }, [onDeleteObservableType, setSelectedItem, selectedItem]);

  const onCancel = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const showModal = Boolean(selectedItem);

  return observableTypes.length ? (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexStart" data-test-subj="observable-types-list">
        <EuiFlexItem>
          {observableTypes.map((observableType) => (
            <React.Fragment key={observableType.key}>
              <EuiPanel
                paddingSize="s"
                data-test-subj={`observable-type-${observableType.key}`}
                hasShadow={false}
              >
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={true}>
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiText>
                          <h4>{observableType.label}</h4>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup alignItems="flexEnd" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          data-test-subj={`${observableType.key}-observable-type-edit`}
                          aria-label={`${observableType.key}-observable-type-edit`}
                          iconType="pencil"
                          color="primary"
                          disabled={props.disabled}
                          onClick={() => onEditObservableType(observableType.key)}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          data-test-subj={`${observableType.key}-observable-type-delete`}
                          aria-label={`${observableType.key}-observable-type-delete`}
                          iconType="minusInCircle"
                          color="danger"
                          disabled={props.disabled}
                          onClick={() => setSelectedItem(observableType)}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
              <EuiSpacer size="s" />
            </React.Fragment>
          ))}
        </EuiFlexItem>
        {showModal && selectedItem ? (
          <DeleteConfirmationModal
            title={i18n.DELETE_OBSERVABLE_TYPE_TITLE(selectedItem.label)}
            message={i18n.DELETE_OBSERVABLE_TYPE_DESCRIPTION}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        ) : null}
      </EuiFlexGroup>
    </>
  ) : null;
};

ObservableTypesListComponent.displayName = 'ObservableTypesListComponent';

export const ObservableTypesList = React.memo(ObservableTypesListComponent);
