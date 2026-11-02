/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import * as i18n from '../translations';

import type { ObservableTypesConfiguration } from '../../../../common/types/domain';
import { DeleteConfirmationModal } from '../../configure_cases/delete_confirmation_modal';

export interface ObservableTypesListProps {
  disabled: boolean;
  observableTypes: ObservableTypesConfiguration;
  onDeleteObservableType: (key: string) => void;
  onEditObservableType: (key: string) => void;
  /**
   * Renders the list as line-separated rows instead of individual panels.
   * Only used by the cases redesign settings page.
   */
  useLineSeparators?: boolean;
}

const ObservableTypesListComponent: React.FC<ObservableTypesListProps> = (props) => {
  const { observableTypes, onDeleteObservableType, onEditObservableType, useLineSeparators } =
    props;
  const { euiTheme } = useEuiTheme();
  const [selectedItem, setSelectedItem] = useState<ObservableTypesConfiguration[number] | null>(
    null
  );

  const redesignRowCss = useMemo(
    () => css`
      padding: ${euiTheme.size.s} 0;
      border-bottom: ${euiTheme.border.thin};
    `,
    [euiTheme]
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

  const actionButtons = (observableType: ObservableTypesConfiguration[number]) => (
    <>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={`${observableType.key}-observable-type-edit`}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            data-test-subj={`${observableType.key}-observable-type-edit`}
            aria-label={`${observableType.key}-observable-type-edit`}
            iconType="pencil"
            color="primary"
            disabled={props.disabled}
            onClick={() => onEditObservableType(observableType.key)}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={`${observableType.key}-observable-type-delete`}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            data-test-subj={`${observableType.key}-observable-type-delete`}
            aria-label={`${observableType.key}-observable-type-delete`}
            iconType="minusCircle"
            color="danger"
            disabled={props.disabled}
            onClick={() => setSelectedItem(observableType)}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </>
  );

  const redesignList = (
    <EuiFlexGroup
      justifyContent="flexStart"
      direction="column"
      gutterSize="none"
      data-test-subj="observable-types-list"
    >
      <EuiFlexItem>
        {observableTypes.map((observableType) => (
          <div
            key={observableType.key}
            css={redesignRowCss}
            data-test-subj={`observable-type-${observableType.key}`}
          >
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={true}>
                <EuiText size="s">
                  <h4>{observableType.label}</h4>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  {actionButtons(observableType)}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
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
  );

  const legacyList = (
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
                      {actionButtons(observableType)}
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
  );

  return observableTypes.length ? (useLineSeparators ? redesignList : legacyList) : null;
};

ObservableTypesListComponent.displayName = 'ObservableTypesListComponent';

export const ObservableTypesList = React.memo(ObservableTypesListComponent);
